import middy from '@middy/core';
import envConfig from '@revelationsai/core/configs/env';
import { aiResponsesToSourceDocuments, userMessages } from '@revelationsai/core/database/schema';
import type { AnthropicModelId } from '@revelationsai/core/langchain/types/bedrock-types';
import type { NeonVectorStoreDocument } from '@revelationsai/core/langchain/vectorstores/neon';
import type { Chat } from '@revelationsai/core/model/chat';
import type { UserWithRoles } from '@revelationsai/core/model/user';
import type { RAIChatMessage } from '@revelationsai/server/services/chat/message';
import { LangChainStream } from 'ai';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { and, eq, or } from 'drizzle-orm';
import { CallbackManager } from 'langchain/callbacks';
import { Readable } from 'stream';
import { v4 as uuidV4 } from 'uuid';
import { getRAIChatChain } from './lib/chat/langchain';
import db from './lib/database';
import {
  aiResponseService,
  chatService,
  sessionService,
  userMessageService,
  userQueryCountService,
  userService
} from './lib/services';
import { aiRenameChat } from './lib/util/chat';

type StreamedAPIGatewayProxyStructuredResultV2 = Omit<APIGatewayProxyStructuredResultV2, 'body'> & {
  body: Readable;
};

function validateRequest(
  event: APIGatewayProxyEventV2
): StreamedAPIGatewayProxyStructuredResultV2 | undefined {
  // Handle CORS preflight request
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Content-Type': 'application/json'
      },
      body: Readable.from([JSON.stringify({})])
    };
  }

  // Reject non-POST requests
  if (event.requestContext.http.method !== 'POST') {
    console.log('Invalid method');
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json'
      },
      body: Readable.from([JSON.stringify({ error: 'Invalid method, must be POST' })])
    };
  }

  return undefined;
}

function validateModelId(
  providedModelId: string,
  userWithRoles: UserWithRoles
): StreamedAPIGatewayProxyStructuredResultV2 | undefined {
  if (
    providedModelId !== 'anthropic.claude-v2:1' &&
    providedModelId !== 'anthropic.claude-v2' &&
    providedModelId !== 'anthropic.claude-v1' &&
    providedModelId !== 'anthropic.claude-instant-v1'
  ) {
    console.log('Invalid modelId provided');
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json'
      },
      body: Readable.from([JSON.stringify({ error: 'Invalid model ID provided' })])
    };
  }
  if (
    providedModelId !== 'anthropic.claude-instant-v1' &&
    !userService.hasPlusSync(userWithRoles) &&
    !userService.isAdminSync(userWithRoles)
  ) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json'
      },
      body: Readable.from([
        JSON.stringify({
          error: `Your plan does not support this model. Please upgrade to a plan that supports this model.`
        })
      ])
    };
  }
  return undefined;
}

async function postResponseValidationLogic({
  modelId,
  chat,
  userMessageId,
  aiResponseId,
  userId,
  response,
  sourceDocuments,
  searchQueries
}: {
  modelId: AnthropicModelId;
  chat: Chat;
  userMessageId: string;
  aiResponseId: string;
  userId: string;
  lastMessage: RAIChatMessage;
  response: string;
  sourceDocuments: NeonVectorStoreDocument[];
  searchQueries: string[];
}): Promise<void> {
  const aiResponse = await aiResponseService.createAiResponse({
    id: aiResponseId,
    chatId: chat.id,
    userMessageId: userMessageId,
    userId,
    text: response,
    modelId,
    searchQueries
  });

  await Promise.all([
    ...sourceDocuments.map(async (sourceDoc) => {
      await db.insert(aiResponsesToSourceDocuments).values({
        aiResponseId: aiResponse.id,
        sourceDocumentId: sourceDoc.id,
        distance: sourceDoc.distance,
        distanceMetric: sourceDoc.distanceMetric
      });
    })
  ]);
}

async function lambdaHandler(
  event: APIGatewayProxyEventV2
): Promise<StreamedAPIGatewayProxyStructuredResultV2> {
  console.log(`Received Chat Request Event: ${JSON.stringify(event)}`);

  const validationResponse = validateRequest(event);
  if (validationResponse) {
    return validationResponse;
  }

  const pendingPromises: Promise<unknown>[] = []; // promises to wait for before closing the stream

  if (!event.body) {
    console.log('Missing body');
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json'
      },
      body: Readable.from([JSON.stringify({ error: 'Missing body' })])
    };
  }

  const {
    messages = [],
    chatId,
    modelId: providedModelId
  }: {
    messages: RAIChatMessage[];
    chatId?: string;
    modelId?: AnthropicModelId;
  } = JSON.parse(event.body);

  try {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      console.log('Invalid last message');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: Readable.from([JSON.stringify({ error: 'Invalid last message' })])
      };
    }

    console.time('Validating session token');
    const { isValid, userWithRoles, remainingQueries, maxQueries } =
      await sessionService.validNonApiHandlerSession(event.headers.authorization?.split(' ')[1]);
    if (!isValid) {
      console.log('Invalid session token');
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json'
        },
        body: Readable.from([JSON.stringify({ error: 'Invalid session token' })])
      };
    }
    console.timeEnd('Validating session token');

    if (remainingQueries <= 0) {
      console.log(`Max daily query count of ${maxQueries} reached`);
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json'
        },
        body: Readable.from([
          JSON.stringify({
            error: `Max daily query count of ${maxQueries} reached`
          })
        ])
      };
    }
    const incrementQueryCountPromise = userQueryCountService.incrementUserQueryCount(
      userWithRoles.id
    );
    pendingPromises.push(incrementQueryCountPromise);

    if (providedModelId) {
      const modelIdValidationResponse = validateModelId(providedModelId, userWithRoles);
      if (modelIdValidationResponse) {
        return modelIdValidationResponse;
      }
    }
    const modelId =
      (userService.hasPlusSync(userWithRoles) || userService.isAdminSync(userWithRoles)) &&
      !envConfig.isLocal
        ? 'anthropic.claude-v2:1'
        : 'anthropic.claude-instant-v1';

    console.time('Validating chat');
    const chat = chatId
      ? await chatService.getChat(chatId).then(async (foundChat) => {
          if (!foundChat || !userService.isObjectOwner(foundChat, userWithRoles.id)) {
            return await chatService.createChat({
              userId: userWithRoles.id
            });
          }
          return foundChat;
        })
      : await chatService.createChat({
          userId: userWithRoles.id
        });

    console.timeEnd('Validating chat');

    if (!chat.customName) {
      pendingPromises.push(aiRenameChat(chat, messages));
    } else {
      pendingPromises.push(
        chatService.updateChat(chat.id, {
          updatedAt: new Date()
        })
      );
    }

    console.time('Validating user message');
    const userMessage = await userMessageService
      .getUserMessages({
        where: and(
          eq(userMessages.chatId, chat.id),
          lastMessage.uuid
            ? eq(userMessages.id, lastMessage.uuid)
            : or(eq(userMessages.text, lastMessage.content), eq(userMessages.aiId, lastMessage.id))
        )
      })
      .then(async (userMessages) => {
        const userMessage = userMessages.at(0);
        if (userMessage) {
          pendingPromises.push(
            aiResponseService
              .getAiResponsesByUserMessageId(userMessage.id)
              .then(async (aiResponses) => {
                await Promise.all(
                  aiResponses.map(async (aiResponse) => {
                    await aiResponseService.updateAiResponse(aiResponse.id, {
                      regenerated: true
                    });
                  })
                );
              })
          );
          return userMessage;
        }
        return await userMessageService.createUserMessage({
          aiId: lastMessage.id,
          text: lastMessage.content,
          chatId: chat.id,
          userId: userWithRoles.id
        });
      });
    console.timeEnd('Validating user message');

    const aiResponseId = uuidV4();
    const { stream, handlers } = LangChainStream();
    const chain = await getRAIChatChain({
      modelId,
      user: userWithRoles,
      messages,
      callbacks: CallbackManager.fromHandlers(handlers)
    });
    const langChainResponsePromise = chain
      .invoke({
        query: lastMessage.content
      })
      .then(async (result) => {
        console.log(`LangChain result: ${JSON.stringify(result)}`);
        const sourceDocuments = result.sourceDocuments ?? [];
        const searchQueries = result.searchQueries ?? [];
        await postResponseValidationLogic({
          modelId,
          chat,
          userMessageId: userMessage.id,
          aiResponseId,
          userId: userWithRoles.id,
          lastMessage,
          response: result.text,
          sourceDocuments,
          searchQueries
        });
        return result;
      })
      .catch(async (err) => {
        console.error(`Error: ${err.stack}`);
        await Promise.all([
          incrementQueryCountPromise.then(() => {
            userQueryCountService.decrementUserQueryCount(userWithRoles.id);
          }),
          aiResponseService.getAiResponse(aiResponseId).then(async (aiResponse) => {
            if (aiResponse) {
              await aiResponseService.updateAiResponse(aiResponse.id, {
                failed: true
              });
            }
          })
        ]);
        throw err;
      });
    pendingPromises.push(langChainResponsePromise);

    const reader = stream.getReader();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-chat-id': chat.id,
        'x-user-message-id': userMessage.id,
        'x-ai-response-id': aiResponseId
      },
      body: new Readable({
        read() {
          reader
            .read()
            .then(async ({ done, value }: { done: boolean; value?: unknown }) => {
              if (done) {
                console.log('Finished chat stream response');
                await Promise.all(pendingPromises); // make sure everything is done before destroying the stream
                this.push(null);
                this.destroy();
                return;
              }
              if (value) {
                console.log(`Pushing ${typeof value}: ${value}`);
                this.push(value, 'utf-8');
              }
              this.read();
            })
            .catch(async (err) => {
              console.error(`Error while streaming response: ${err}`);
              await Promise.all(pendingPromises); // make sure everything is done before destroying the stream
              this.push(null);
              this.destroy(err);
              throw err;
            });
        }
      })
    };
  } catch (error) {
    console.error(`Caught error: ${JSON.stringify(error)}`);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: Readable.from([
        JSON.stringify({
          error:
            error instanceof Error
              ? `${error.message}: ${error.stack}`
              : `Error: ${JSON.stringify(error)}`
        })
      ])
    };
  }
}

export const handler = middy({ streamifyResponse: true }).handler(lambdaHandler);

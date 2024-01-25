import { buildOrderBy } from '@revelationsai/core/database/helpers';
import { aiResponseReactions } from '@revelationsai/core/database/schema';
import type { AiResponseReactionInfo } from '@revelationsai/core/model/ai-response/reaction';
import {
  InternalServerErrorResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { aiResponseReactionService, sessionService, userService } from '../../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const searchParams = event.queryStringParameters ?? {};
  const limit = parseInt(searchParams.limit ?? '25');
  const page = parseInt(searchParams.page ?? '1');
  const orderBy = searchParams.orderBy ?? 'createdAt';
  const order = searchParams.order ?? 'desc';

  try {
    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid) {
      return UnauthorizedResponse('You must be signed in.');
    }

    if (!userService.isAdminSync(userWithRoles)) {
      return UnauthorizedResponse('You do not have permission to view these reactions.');
    }

    const reactions = await aiResponseReactionService.getAiResponseReactionsWithInfo({
      limit,
      offset: (page - 1) * limit,
      orderBy: buildOrderBy(aiResponseReactions, orderBy, order)
    });

    return OkResponse({
      entities: reactions.map((reaction) => {
        return {
          ...reaction.ai_response_reactions,
          user: reaction.users,
          response: reaction.ai_responses
        } satisfies AiResponseReactionInfo;
      }),
      page,
      perPage: limit
    });
  } catch (err) {
    console.error('Error searching AI response reactions:', err);
    if (err instanceof Error) {
      return InternalServerErrorResponse(`${err.message}\n${err.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(err));
    }
  }
});

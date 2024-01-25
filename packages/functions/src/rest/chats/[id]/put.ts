import type { Chat } from '@revelationsai/core/model/chat';
import {
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { chatService, sessionService, userService } from '../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;
  const data = JSON.parse(event.body ?? '{}');

  try {
    let chat: Chat | undefined = await chatService.getChat(id);
    if (!chat) {
      return ObjectNotFoundResponse(id);
    }

    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid || !userService.isObjectOwner(chat, userWithRoles.id)) {
      return UnauthorizedResponse('You are not authorized to edit this chat');
    }

    chat = await chatService.updateChat(chat!.id, data);

    return OkResponse(chat);
  } catch (error) {
    console.error(`Error updating chat '${id}':`, error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

import {
  CreatedResponse,
  InternalServerErrorResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { sessionService, userMessageService } from '../../lib/services';

export const handler = ApiHandler(async (event) => {
  const data = JSON.parse(event.body ?? '{}');

  try {
    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid) {
      return UnauthorizedResponse('You must be logged in.');
    }

    const message = await userMessageService.createUserMessage({
      ...data,
      userId: userWithRoles.id
    });

    return CreatedResponse(message);
  } catch (error) {
    console.error('Error creating user message:', error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

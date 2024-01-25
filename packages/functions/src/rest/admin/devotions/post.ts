import {
  CreatedResponse,
  InternalServerErrorResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { sessionService, userService } from '../../../lib/services';
import { generateDevotion } from '../../../lib/util/devotion';

export const handler = ApiHandler(async (event) => {
  console.log('Received devotion create event:', event);

  const { topic, bibleVerse } = JSON.parse(event.body ?? '{}');

  try {
    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid || !userService.isAdminSync(userWithRoles)) {
      return UnauthorizedResponse();
    }

    const devo = await generateDevotion(topic, bibleVerse);

    return CreatedResponse(devo);
  } catch (error) {
    console.error('Error creating devotion:', error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

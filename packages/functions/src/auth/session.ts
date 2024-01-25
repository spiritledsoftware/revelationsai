import type { UserInfo } from '@revelationsai/core/model/user';
import { OkResponse, UnauthorizedResponse } from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { sessionService } from '../lib/services';

export const handler = ApiHandler(async (event) => {
  console.debug('Received session validation event: ', event);

  const {
    isValid,
    userWithRoles,
    maxQueries,
    remainingQueries,
    sessionToken,
    maxGeneratedImages,
    remainingGeneratedImages
  } = await sessionService.validApiHandlerSession();

  if (!isValid) {
    console.debug('Invalid session token: ', sessionToken);
    return UnauthorizedResponse('Invalid session token');
  }
  return OkResponse({
    ...userWithRoles,
    maxQueries,
    remainingQueries,
    maxGeneratedImages,
    remainingGeneratedImages
  } satisfies UserInfo);
});

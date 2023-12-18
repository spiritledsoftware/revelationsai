import type { UserInfo } from '@core/model';
import { OkResponse, UnauthorizedResponse } from '@lib/api-responses';
import * as Sentry from '@sentry/serverless';
import { validApiHandlerSession } from '@services/session';
import { ApiHandler } from 'sst/node/api';

export const handler = Sentry.AWSLambda.wrapHandler(
  ApiHandler(async (event) => {
    console.debug('Received session validation event: ', event);

    const {
      isValid,
      userWithRoles,
      maxQueries,
      remainingQueries,
      sessionToken,
      maxGeneratedImages,
      remainingGeneratedImages
    } = await validApiHandlerSession();

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
  })
);

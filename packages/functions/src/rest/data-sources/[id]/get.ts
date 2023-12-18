import {
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse,
  UnauthorizedResponse
} from '@lib/api-responses';
import { getDataSource } from '@services/data-source';
import { validApiHandlerSession } from '@services/session';
import { ApiHandler } from 'sst/node/api';
import * as Sentry from '@sentry/serverless';

export const handler = Sentry.AWSLambda.wrapHandler(
  ApiHandler(async (event) => {
    const id = event.pathParameters!.id!;

    try {
      const { isValid } = await validApiHandlerSession();
      if (!isValid) {
        return UnauthorizedResponse();
      }

      const dataSource = await getDataSource(id);
      if (!dataSource) {
        return ObjectNotFoundResponse(id);
      }

      return OkResponse(dataSource);
    } catch (error) {
      console.error(`Error getting data source '${id}':`, error);
      if (error instanceof Error) {
        return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
      } else {
        return InternalServerErrorResponse(JSON.stringify(error));
      }
    }
  })
);

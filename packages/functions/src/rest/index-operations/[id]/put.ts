import { InternalServerErrorResponse, OkResponse, UnauthorizedResponse } from '@lib/api-responses';
import * as Sentry from '@sentry/serverless';
import { getIndexOperationOrThrow, updateIndexOperation } from '@services/data-source/index-op';
import { validApiHandlerSession } from '@services/session';
import { isAdmin } from '@services/user';
import { ApiHandler } from 'sst/node/api';

export const handler = Sentry.AWSLambda.wrapHandler(
  ApiHandler(async (event) => {
    const id = event.pathParameters!.id!;
    const data = JSON.parse(event.body ?? '{}');

    try {
      const { isValid, userWithRoles } = await validApiHandlerSession();
      if (!isValid || !(await isAdmin(userWithRoles.id))) {
        return UnauthorizedResponse();
      }

      let indexOp = await getIndexOperationOrThrow(id);

      indexOp = await updateIndexOperation(indexOp!.id, data);

      return OkResponse(indexOp);
    } catch (error) {
      console.error(`Error updating index operation '${id}':`, error);
      if (error instanceof Error) {
        return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
      } else {
        return InternalServerErrorResponse(JSON.stringify(error));
      }
    }
  })
);

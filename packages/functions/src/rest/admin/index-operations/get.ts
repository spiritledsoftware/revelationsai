import { buildOrderBy } from '@revelationsai/core/database/helpers';
import { indexOperations } from '@revelationsai/core/database/schema';
import {
  InternalServerErrorResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { indexOperationService, sessionService, userService } from '../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const searchParams = event.queryStringParameters ?? {};
  const limit = parseInt(searchParams.limit ?? '25');
  const page = parseInt(searchParams.page ?? '1');
  const orderBy = searchParams.orderBy ?? 'createdAt';
  const order = searchParams.order ?? 'desc';

  try {
    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid || !userService.isAdminSync(userWithRoles)) {
      return UnauthorizedResponse();
    }

    const indexOps = await indexOperationService.getIndexOperations({
      offset: (page - 1) * limit,
      limit,
      orderBy: buildOrderBy(indexOperations, orderBy, order)
    });

    return OkResponse({
      entities: indexOps,
      page,
      perPage: limit
    });
  } catch (error) {
    console.error('Error searching data sources:', error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

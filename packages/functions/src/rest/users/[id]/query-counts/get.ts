import { buildOrderBy } from '@revelationsai/core/database/helpers';
import { userQueryCounts } from '@revelationsai/core/database/schema';
import {
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { sessionService, userQueryCountService, userService } from '../../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;
  const searchParams = event.queryStringParameters ?? {};
  const limit = parseInt(searchParams.limit ?? '25');
  const page = parseInt(searchParams.page ?? '1');
  const orderBy = searchParams.orderBy ?? 'createdAt';
  const order = searchParams.order ?? 'desc';

  try {
    const user = await userService.getUser(id);
    if (!user) {
      return ObjectNotFoundResponse(id);
    }

    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid || user.id !== userWithRoles.id) {
      return UnauthorizedResponse("You are not authorized to view this user's query count.");
    }

    const queryCounts = await userQueryCountService.getUserQueryCountsByUserId(id, {
      limit,
      offset: (page - 1) * limit,
      orderBy: buildOrderBy(userQueryCounts, orderBy, order)
    });

    return OkResponse({
      entities: queryCounts,
      page,
      perPage: limit
    });
  } catch (error) {
    console.error('Error getting user query counts:', error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

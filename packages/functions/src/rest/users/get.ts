import { buildOrderBy } from '@revelationsai/core/database/helpers';
import { users as usersTable } from '@revelationsai/core/database/schema';
import { InternalServerErrorResponse, OkResponse } from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { userService } from '../../lib/services';

export const handler = ApiHandler(async (event) => {
  const searchParams = event.queryStringParameters ?? {};
  const limit = parseInt(searchParams.limit ?? '25');
  const page = parseInt(searchParams.page ?? '1');
  const orderBy = searchParams.orderBy ?? 'createdAt';
  const order = searchParams.order ?? 'desc';

  try {
    const users = await userService.getUsers({
      limit,
      offset: (page - 1) * limit,
      orderBy: buildOrderBy(usersTable, orderBy, order)
    });

    return OkResponse({
      entities: users,
      page,
      perPage: limit
    });
  } catch (error) {
    console.error('Error getting users:', error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

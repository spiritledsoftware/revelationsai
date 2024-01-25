import { buildOrderBy, buildQuery } from '@revelationsai/core/database/helpers';
import { chats } from '@revelationsai/core/database/schema';
import {
  InternalServerErrorResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { and, eq } from 'drizzle-orm';
import { ApiHandler } from 'sst/node/api';
import { chatService, sessionService } from '../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const searchParams = event.queryStringParameters ?? {};
  const limit = parseInt(searchParams.limit ?? '25');
  const page = parseInt(searchParams.page ?? '1');
  const orderBy = searchParams.orderBy ?? 'createdAt';
  const order = searchParams.order ?? 'desc';
  const query = JSON.parse(event.body ?? '{}');

  console.log('Received chat search request: ', {
    query: JSON.stringify(query),
    limit,
    page,
    orderBy,
    order
  });

  try {
    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid) {
      return UnauthorizedResponse('You must be logged in');
    }

    const foundChats = await chatService.getChats({
      where: and(buildQuery(chats, query), eq(chats.userId, userWithRoles.id)),
      limit,
      offset: (page - 1) * limit,
      orderBy: buildOrderBy(chats, orderBy, order)
    });

    return OkResponse({
      entities: foundChats,
      page,
      perPage: limit
    });
  } catch (error) {
    console.error('Error searching chats:', error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

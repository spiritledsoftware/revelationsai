import { buildOrderBy, buildQuery } from '@revelationsai/core/database/helpers';
import { devotions } from '@revelationsai/core/database/schema';
import { InternalServerErrorResponse, OkResponse } from '@revelationsai/server/lib/api-responses';
import { and, eq } from 'drizzle-orm';
import { ApiHandler } from 'sst/node/api';
import { devotionService } from '../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const searchParams = event.queryStringParameters ?? {};
  const limit = parseInt(searchParams.limit ?? '25');
  const page = parseInt(searchParams.page ?? '1');
  const orderBy = searchParams.orderBy ?? 'createdAt';
  const order = searchParams.order ?? 'desc';
  const query = JSON.parse(event.body ?? '{}');
  const includeFailed = searchParams.includeFailed === 'true';

  console.log('Received devotion search request: ', {
    query: JSON.stringify(query),
    limit,
    page,
    orderBy,
    order
  });

  try {
    const devos = await devotionService.getDevotions({
      where: and(
        buildQuery(devotions, query),
        includeFailed ? undefined : eq(devotions.failed, false)
      ),
      limit,
      offset: (page - 1) * limit,
      orderBy: buildOrderBy(devotions, orderBy, order)
    });

    return OkResponse({
      entities: devos,
      page,
      perPage: limit
    });
  } catch (error) {
    console.error('Error searching devotions:', error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

import { buildOrderBy, buildQuery } from '@revelationsai/core/database/helpers';
import { dataSources as dataSourcesTable } from '@revelationsai/core/database/schema';
import { InternalServerErrorResponse, OkResponse } from '@revelationsai/server/lib/api-responses';
import { and } from 'drizzle-orm';
import { ApiHandler } from 'sst/node/api';
import { dataSourceService } from '../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const searchParams = event.queryStringParameters ?? {};
  const limit = parseInt(searchParams.limit ?? '25');
  const page = parseInt(searchParams.page ?? '1');
  const orderBy = searchParams.orderBy ?? 'createdAt';
  const order = searchParams.order ?? 'desc';
  const query = JSON.parse(event.body ?? '{}');

  console.log('Received data source search request: ', {
    query: JSON.stringify(query),
    limit,
    page,
    orderBy,
    order
  });

  try {
    const dataSources = await dataSourceService.getDataSources({
      where: and(buildQuery(dataSourcesTable, query)),
      limit,
      offset: (page - 1) * limit,
      orderBy: buildOrderBy(dataSourcesTable, orderBy, order)
    });

    return OkResponse({
      entities: dataSources,
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

import {
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { dataSourceService } from '../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;

  try {
    const dataSource = await dataSourceService.getDataSource(id);
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
});

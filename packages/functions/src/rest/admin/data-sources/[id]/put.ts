import {
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { dataSourceService, sessionService, userService } from '../../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;
  const data = JSON.parse(event.body ?? '{}');

  try {
    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid || !userService.isAdminSync(userWithRoles)) {
      return UnauthorizedResponse();
    }

    let dataSource = await dataSourceService.getDataSource(id);
    if (!dataSource) {
      return ObjectNotFoundResponse(id);
    }

    [dataSource] = await Promise.all([
      dataSourceService.updateDataSource(dataSource!.id, data),
      dataSourceService.updateDataSourceRelatedDocuments(dataSource!.id, dataSource!)
    ]);

    return OkResponse(dataSource);
  } catch (error) {
    console.error(`Error updating data source '${id}':`, error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

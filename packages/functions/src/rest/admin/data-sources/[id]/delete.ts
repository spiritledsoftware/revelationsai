import {
  DeletedResponse,
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { dataSourceService, sessionService, userService } from '../../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;

  try {
    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid || !userWithRoles.id || !userService.isAdminSync(userWithRoles)) {
      return UnauthorizedResponse();
    }

    const dataSource = await dataSourceService.getDataSource(id);
    if (!dataSource) {
      return ObjectNotFoundResponse(id);
    }

    await Promise.all([
      dataSourceService.deleteDataSource(dataSource!.id),
      dataSourceService.deleteDataSourceRelatedDocuments(dataSource!.id)
    ]);

    return DeletedResponse();
  } catch (error) {
    console.error(`Error deleting data source '${id}':`, error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

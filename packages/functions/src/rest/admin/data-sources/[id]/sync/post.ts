import {
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { dataSourceService, sessionService, userService } from '../../../../../lib/services';
import { syncDataSource } from '../../../../../lib/util/data-source';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;

  try {
    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid || !(await userService.isAdminSync(userWithRoles))) {
      return UnauthorizedResponse();
    }

    const dataSource = await dataSourceService.getDataSource(id);
    if (!dataSource) {
      return ObjectNotFoundResponse(id);
    }

    await syncDataSource(dataSource.id, true);

    return OkResponse(dataSource);
  } catch (error) {
    console.error(`Error syncing data source '${id}':`, error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

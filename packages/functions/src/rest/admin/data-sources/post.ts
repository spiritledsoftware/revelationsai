import {
  CreatedResponse,
  InternalServerErrorResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { dataSourceService, sessionService, userService } from '../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const data = JSON.parse(event.body ?? '{}');
  try {
    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid || !userService.isAdminSync(userWithRoles)) {
      return UnauthorizedResponse();
    }
    const dataSource = await dataSourceService.createDataSource({
      ...data,
      userId: userWithRoles.id
    });
    return CreatedResponse(dataSource);
  } catch (error) {
    console.error('Error creating data source:', error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

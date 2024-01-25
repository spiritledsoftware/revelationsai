import {
  DeletedResponse,
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { sessionService, userService } from '../../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;

  try {
    const user = await userService.getUser(id);
    if (!user) {
      return ObjectNotFoundResponse(id);
    }

    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid || !userService.isAdminSync(userWithRoles)) {
      return UnauthorizedResponse();
    }

    await userService.deleteUser(user.id);
    return DeletedResponse(user.id);
  } catch (error) {
    console.error(`Error deleting user '${id}':`, error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

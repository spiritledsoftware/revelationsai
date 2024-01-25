import type { Devotion } from '@revelationsai/core/model/devotion';
import {
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { devotionService, sessionService, userService } from '../../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;
  const data = JSON.parse(event.body ?? '{}');

  try {
    let devo: Devotion | undefined = await devotionService.getDevotion(id);
    if (!devo) {
      return ObjectNotFoundResponse(id);
    }

    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid || !userService.isAdminSync(userWithRoles)) {
      return UnauthorizedResponse();
    }

    devo = await devotionService.updateDevotion(devo!.id, data);

    return OkResponse(devo);
  } catch (error) {
    console.error(`Error updating devotion '${id}':`, error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

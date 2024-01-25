import {
  DeletedResponse,
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { userGeneratedImageService, sessionService, userService } from '../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;
  try {
    const image = await userGeneratedImageService.getUserGeneratedImage(id);
    if (!image) {
      return ObjectNotFoundResponse(id);
    }

    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid || !userService.isObjectOwner(image, userWithRoles.id)) {
      return UnauthorizedResponse('You are not authorized to delete this image');
    }

    await userGeneratedImageService.deleteUserGeneratedImage(image.id);
    return DeletedResponse(image.id);
  } catch (error) {
    console.error(`Error deleting user generated image '${id}':`, error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

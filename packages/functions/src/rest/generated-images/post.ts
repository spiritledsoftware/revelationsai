import {
  BadRequestResponse,
  CreatedResponse,
  InternalServerErrorResponse,
  TooManyRequestsResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { sessionService, userGeneratedImageCountService } from '../../lib/services';
import { generatedImage } from '../../lib/util/generated-image';

export const handler = ApiHandler(async (event) => {
  const payload = JSON.parse(event.body ?? '{}');

  const { prompt } = payload;

  if (!prompt) {
    return BadRequestResponse('You must provide a prompt');
  }

  try {
    const { isValid, userWithRoles, remainingGeneratedImages } =
      await sessionService.validApiHandlerSession();
    if (!isValid) {
      return UnauthorizedResponse('You must be logged in');
    }

    if (remainingGeneratedImages < 1) {
      return TooManyRequestsResponse(
        'You have exceeded your daily allowed images. Please upgrade for more!'
      );
    }

    const incrementUserGeneratedImageCountPromise =
      userGeneratedImageCountService.incrementUserGeneratedImageCount(userWithRoles.id);
    const image = await generatedImage(userWithRoles, prompt).catch(async (error) => {
      await incrementUserGeneratedImageCountPromise.then(() => {
        userGeneratedImageCountService.decrementUserGeneratedImageCount(userWithRoles.id);
      });
      throw error;
    });
    return CreatedResponse(image);
  } catch (error) {
    console.error('Error creating generated image:', error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

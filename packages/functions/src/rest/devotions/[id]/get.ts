import {
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { devotionService } from '../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;

  try {
    const devo = await devotionService.getDevotion(id);
    if (!devo) {
      return ObjectNotFoundResponse(id);
    }

    return OkResponse(devo);
  } catch (error) {
    console.error(`Error getting devotion '${id}':`, error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

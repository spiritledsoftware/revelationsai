import {
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { devotionReactionService, devotionService } from '../../../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;

  try {
    const devotion = await devotionService.getDevotion(id);
    if (!devotion) {
      return ObjectNotFoundResponse(id);
    }

    const devoReactionCounts = await devotionReactionService.getDevotionReactionCounts(id);

    return OkResponse(devoReactionCounts);
  } catch (err) {
    console.error(`Error getting reaction counts for devotion '${id}':`, err);
    if (err instanceof Error) {
      return InternalServerErrorResponse(`${err.message}\n${err.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(err));
    }
  }
});

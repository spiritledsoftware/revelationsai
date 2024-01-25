import {
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { devotionService, sourceDocumentService } from '../../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;

  try {
    const devotion = await devotionService.getDevotion(id);
    if (!devotion) {
      return ObjectNotFoundResponse(id);
    }

    const sourceDocuments = await sourceDocumentService.getDevotionSourceDocuments(devotion.id);

    return OkResponse(
      sourceDocuments.map((sourceDocument) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { embedding, ...rest } = sourceDocument;
        return rest;
      })
    );
  } catch (error) {
    console.error(`Error getting source documents for devotion '${id}':`, error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

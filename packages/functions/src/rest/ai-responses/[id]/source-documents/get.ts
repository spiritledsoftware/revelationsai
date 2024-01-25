import {
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import {
  aiResponseService,
  sessionService,
  sourceDocumentService,
  userService
} from '../../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;
  try {
    const aiResponse = await aiResponseService.getAiResponse(id);
    if (!aiResponse) {
      return ObjectNotFoundResponse(id);
    }

    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid || !userService.isObjectOwner(aiResponse, userWithRoles.id)) {
      return UnauthorizedResponse('You are not authorized to view these source documents.');
    }

    const sourceDocuments = await sourceDocumentService.getAiResponseSourceDocuments(aiResponse.id);

    return OkResponse(
      sourceDocuments.map((sourceDocument) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { embedding, ...rest } = sourceDocument;
        return rest;
      })
    );
  } catch (error) {
    console.error(`Error getting source documents for ai response '${id}':`, error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

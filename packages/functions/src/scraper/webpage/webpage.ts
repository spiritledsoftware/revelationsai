import {
  BadRequestResponse,
  ForbiddenResponse,
  InternalServerErrorResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { indexWebPage } from '../../lib/scraper/webpage';
import { sessionService, userService } from '../../lib/services';

export const handler = ApiHandler(async (event) => {
  const { dataSourceId, name, url, metadata = '{}' } = JSON.parse(event.body || '{}');
  if (!dataSourceId || !url || !name) {
    return BadRequestResponse('Missing required fields');
  }

  try {
    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid) {
      return UnauthorizedResponse();
    }

    if (!userService.isAdminSync(userWithRoles)) {
      return ForbiddenResponse();
    }

    const indexOp = await indexWebPage({
      dataSourceId,
      name,
      url,
      metadata: JSON.parse(metadata)
    });

    return OkResponse({
      message: 'Success',
      indexOp
    });
  } catch (err) {
    console.error(`Error indexing web page '${url}':`, err);
    if (err instanceof Error) {
      return InternalServerErrorResponse(`${err.message}\n${err.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(err));
    }
  }
});

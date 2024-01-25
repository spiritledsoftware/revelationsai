import {
  BadRequestResponse,
  ForbiddenResponse,
  InternalServerErrorResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { indexWebCrawl } from '../lib/scraper/web-crawl';
import { sessionService, userService } from '../lib/services';

type RequestBody = {
  dataSourceId: string;
  url: string;
  pathRegex: string;
  name: string;
  metadata?: string;
};

export const handler = ApiHandler(async (event) => {
  console.log('Received web crawl event:', event);

  const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
  if (!isValid) {
    return UnauthorizedResponse('You must be logged in to perform this action');
  }

  if (!userService.isAdminSync(userWithRoles)) {
    return ForbiddenResponse('You must be an admin to perform this action');
  }

  const {
    dataSourceId,
    url,
    pathRegex: pathRegexString,
    name,
    metadata = '{}'
  }: RequestBody = JSON.parse(event.body || '{}');

  if (!name || !url) {
    return BadRequestResponse('Name and url are required');
  }

  if (
    pathRegexString &&
    (pathRegexString.startsWith('/') ||
      pathRegexString.startsWith('\\/') ||
      pathRegexString.endsWith('/') ||
      pathRegexString.endsWith('\\/'))
  ) {
    return BadRequestResponse('Path regex cannot start or end with a forward slash');
  }

  try {
    const indexOp = await indexWebCrawl({
      dataSourceId,
      url,
      pathRegex: pathRegexString,
      name,
      metadata: JSON.parse(metadata)
    });

    return OkResponse({
      message: 'Website index operation started',
      indexOp
    });
  } catch (err) {
    console.error('Error indexing web crawl:', err);
    if (err instanceof Error) {
      return InternalServerErrorResponse(`${err.message}\n${err.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(err));
    }
  }
});

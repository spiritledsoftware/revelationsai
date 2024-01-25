import {
  BadRequestResponse,
  InternalServerErrorResponse,
  OkResponse
} from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { indexRemoteFile } from '../../lib/scraper/file';

export const handler = ApiHandler(async (event) => {
  console.log('Received remote file download event:', event);

  const { name, url, metadata = '{}', dataSourceId } = JSON.parse(event.body || '{}');

  if (!name || !url) {
    return BadRequestResponse('Missing required fields');
  }

  try {
    await indexRemoteFile({
      name,
      url,
      dataSourceId,
      metadata: JSON.parse(metadata)
    });

    return OkResponse({
      body: 'Success'
    });
  } catch (error) {
    console.error(`Error indexing remote file '${url}':`, error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

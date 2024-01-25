import { InternalServerErrorResponse, OkResponse } from '@revelationsai/server/lib/api-responses';
import { ApiHandler } from 'sst/node/api';
import { userMessageService } from '../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const searchParams = event.queryStringParameters ?? {};
  const count = parseInt(searchParams.count ?? '10');

  try {
    const messages = await userMessageService.getMostAskedUserMessages(count);
    return OkResponse(messages.map((message) => message.text));
  } catch (error) {
    console.error('Error getting most sent user messages:', error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

import { buildOrderBy } from '@revelationsai/core/database/helpers';
import { userGeneratedImages } from '@revelationsai/core/database/schema';
import {
  InternalServerErrorResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { and, eq } from 'drizzle-orm';
import { ApiHandler } from 'sst/node/api';
import { sessionService, userGeneratedImageService } from '../../lib/services';

export const handler = ApiHandler(async (event) => {
  const searchParams = event.queryStringParameters ?? {};
  const limit = parseInt(searchParams.limit ?? '25');
  const page = parseInt(searchParams.page ?? '1');
  const orderBy = searchParams.orderBy ?? 'createdAt';
  const order = searchParams.order ?? 'desc';
  const includeFailed = searchParams.includeFailed === 'true';

  try {
    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid) {
      return UnauthorizedResponse('You are not logged in.');
    }

    const images = await userGeneratedImageService.getUserGeneratedImages({
      where: and(
        eq(userGeneratedImages.userId, userWithRoles.id),
        includeFailed ? undefined : eq(userGeneratedImages.failed, false)
      ),
      orderBy: buildOrderBy(userGeneratedImages, orderBy, order),
      offset: (page - 1) * limit,
      limit
    });

    return OkResponse({
      entities: images,
      page,
      perPage: limit
    });
  } catch (error) {
    console.error('Error getting generated images:', error);
    if (error instanceof Error) {
      return InternalServerErrorResponse(`${error.message}\n${error.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(error));
    }
  }
});

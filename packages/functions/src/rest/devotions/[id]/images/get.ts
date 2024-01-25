import { buildOrderBy } from '@revelationsai/core/database/helpers';
import { devotionImages } from '@revelationsai/core/database/schema';
import {
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse
} from '@revelationsai/server/lib/api-responses';
import { eq } from 'drizzle-orm';
import { ApiHandler } from 'sst/node/api';
import { devotionImageService, devotionService } from '../../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;
  const searchParams = event.queryStringParameters ?? {};
  const limit = parseInt(searchParams.limit ?? '25');
  const page = parseInt(searchParams.page ?? '1');
  const orderBy = searchParams.orderBy ?? 'createdAt';
  const order = searchParams.order ?? 'desc';

  try {
    const devotion = await devotionService.getDevotion(id);
    if (!devotion) {
      return ObjectNotFoundResponse(id);
    }

    const devoImages = await devotionImageService.getDevotionImages({
      where: eq(devotionImages.devotionId, devotion.id),
      limit,
      offset: (page - 1) * limit,
      orderBy: buildOrderBy(devotionImages, orderBy, order)
    });

    return OkResponse({
      entities: devoImages,
      page,
      perPage: limit
    });
  } catch (err) {
    console.error(`Error getting images for devotion '${id}':`, err);
    if (err instanceof Error) {
      return InternalServerErrorResponse(`${err.message}\n${err.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(err));
    }
  }
});

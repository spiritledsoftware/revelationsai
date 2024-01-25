import { devotionImages } from '@revelationsai/core/database/schema';
import type {
  CreateDevotionImageData,
  DevotionImage,
  UpdateDevotionImageData
} from '@revelationsai/core/model/devotion/image';
import { SQL, desc, eq } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';
import type { CacheKeysInputFn, CacheService } from '../cache';

export class DevotionImageService {
  static DEVOTION_IMAGES_CACHE_COLLECTION = 'devotionImages';
  static defaultCacheKeysFn: CacheKeysInputFn<DevotionImage> = (image) => [
    { name: 'id', value: image.id },
    { name: 'devotionId', value: image.devotionId, type: 'set' }
  ];
  static DEVOTIONS_CACHE_TTL_SECONDS = 60 * 60 * 24; // 1 day

  private readonly db: RAIDatabase;
  private readonly cacheService: CacheService;

  constructor(config: { db: RAIDatabase; cacheService: CacheService }) {
    this.db = config.db;
    this.cacheService = config.cacheService;
  }

  async getDevotionImages(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(devotionImages.createdAt) } = options;

    return await this.db
      .select()
      .from(devotionImages)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getDevotionImage(id: string) {
    return await this.cacheService.cacheGet({
      collection: DevotionImageService.DEVOTION_IMAGES_CACHE_COLLECTION,
      key: { name: 'id', value: id },
      fn: async () =>
        (await this.db.select().from(devotionImages).where(eq(devotionImages.id, id))).at(0),
      expireSeconds: DevotionImageService.DEVOTIONS_CACHE_TTL_SECONDS
    });
  }

  async getDevotionImageOrThrow(id: string) {
    const devotionImage = await this.getDevotionImage(id);
    if (!devotionImage) {
      throw new Error(`DevotionImage with id ${id} not found`);
    }
    return devotionImage;
  }

  async getDevotionImagesByDevotionId(devotionId: string) {
    return await this.cacheService.cacheGet({
      collection: DevotionImageService.DEVOTION_IMAGES_CACHE_COLLECTION,
      key: { name: 'devotionId', value: devotionId, type: 'set' },
      fn: async () =>
        await this.db
          .select()
          .from(devotionImages)
          .where(eq(devotionImages.devotionId, devotionId)),
      expireSeconds: DevotionImageService.DEVOTIONS_CACHE_TTL_SECONDS
    });
  }

  async createDevotionImage(data: CreateDevotionImageData) {
    return await this.cacheService.cacheUpsert({
      collection: DevotionImageService.DEVOTION_IMAGES_CACHE_COLLECTION,
      keys: DevotionImageService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .insert(devotionImages)
            .values({
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0],
      expireSeconds: DevotionImageService.DEVOTIONS_CACHE_TTL_SECONDS
    });
  }

  async updateDevotionImage(id: string, data: UpdateDevotionImageData) {
    const image = await this.cacheService.cacheUpsert({
      collection: DevotionImageService.DEVOTION_IMAGES_CACHE_COLLECTION,
      keys: [{ name: 'id', value: id }],
      fn: async () =>
        (
          await this.db
            .update(devotionImages)
            .set({
              ...data,
              createdAt: undefined,
              updatedAt: new Date()
            })
            .where(eq(devotionImages.id, id))
            .returning()
        )[0],
      expireSeconds: DevotionImageService.DEVOTIONS_CACHE_TTL_SECONDS,
      invalidateIterables: true
    });
    return image;
  }

  async deleteDevotionImage(id: string) {
    return await this.cacheService.cacheDelete({
      collection: DevotionImageService.DEVOTION_IMAGES_CACHE_COLLECTION,
      keys: DevotionImageService.defaultCacheKeysFn,
      fn: async () =>
        (await this.db.delete(devotionImages).where(eq(devotionImages.id, id)).returning())[0]
    });
  }
}

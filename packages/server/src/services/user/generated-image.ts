import { userGeneratedImages } from '@revelationsai/core/database/schema';
import type {
  CreateUserGeneratedImageData,
  UpdateUserGeneratedImageData,
  UserGeneratedImage
} from '@revelationsai/core/model/user/generated-image';
import { SQL, desc, eq } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';
import type { CacheKeysInputFn, CacheService } from '../cache';

export class UserGeneratedImageService {
  static USER_GENERATED_IMAGES_CACHE_COLLECTION = 'userGeneratedImages';
  static defaultCacheKeysFn: CacheKeysInputFn<UserGeneratedImage> = (image) => [
    { name: 'id', value: image.id },
    { name: 'userId', value: image.userId, type: 'set' }
  ];

  private readonly db: RAIDatabase;
  private readonly cacheService: CacheService;

  constructor(config: { db: RAIDatabase; cacheService: CacheService }) {
    this.db = config.db;
    this.cacheService = config.cacheService;
  }

  async getUserGeneratedImages(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const {
      where,
      limit = 25,
      offset = 0,
      orderBy = desc(userGeneratedImages.createdAt)
    } = options;

    return await this.db
      .select()
      .from(userGeneratedImages)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getUserGeneratedImage(id: string) {
    return await this.cacheService.cacheGet({
      collection: UserGeneratedImageService.USER_GENERATED_IMAGES_CACHE_COLLECTION,
      key: { name: 'id', value: id },
      fn: async () =>
        (await this.db.select().from(userGeneratedImages).where(eq(userGeneratedImages.id, id))).at(
          0
        )
    });
  }

  async getUserGeneratedImageOrThrow(id: string) {
    const devotionImage = await this.getUserGeneratedImage(id);
    if (!devotionImage) {
      throw new Error(`UserGeneratedImage with id ${id} not found`);
    }
    return devotionImage;
  }

  async getUserGeneratedImagesByUserId(userId: string) {
    return await this.cacheService.cacheGet({
      collection: UserGeneratedImageService.USER_GENERATED_IMAGES_CACHE_COLLECTION,
      key: { name: 'userId', value: userId, type: 'set' },
      fn: async () =>
        await this.db
          .select()
          .from(userGeneratedImages)
          .where(eq(userGeneratedImages.userId, userId))
    });
  }

  async createUserGeneratedImage(data: CreateUserGeneratedImageData) {
    return await this.cacheService.cacheUpsert({
      collection: UserGeneratedImageService.USER_GENERATED_IMAGES_CACHE_COLLECTION,
      keys: UserGeneratedImageService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .insert(userGeneratedImages)
            .values({
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0]
    });
  }

  async updateUserGeneratedImage(id: string, data: UpdateUserGeneratedImageData) {
    return await this.cacheService.cacheUpsert({
      collection: UserGeneratedImageService.USER_GENERATED_IMAGES_CACHE_COLLECTION,
      keys: UserGeneratedImageService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .update(userGeneratedImages)
            .set({
              ...data,
              createdAt: undefined,
              updatedAt: new Date()
            })
            .where(eq(userGeneratedImages.id, id))
            .returning()
        )[0],
      invalidateIterables: true
    });
  }

  async deleteUserGeneratedImage(id: string) {
    return await this.cacheService.cacheDelete({
      collection: UserGeneratedImageService.USER_GENERATED_IMAGES_CACHE_COLLECTION,
      keys: UserGeneratedImageService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .delete(userGeneratedImages)
            .where(eq(userGeneratedImages.id, id))
            .returning()
        )[0]
    });
  }
}

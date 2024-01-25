import { userGeneratedImageCounts } from '@revelationsai/core/database/schema';
import type {
  CreateUserGeneratedImageCountData,
  UpdateUserGeneratedImageCountData,
  UserGeneratedImageCount
} from '@revelationsai/core/model/user/image-count';
import { SQL, and, desc, eq, sql } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';
import type { CacheKeysInputFn, CacheService } from '../cache';

export class UserGeneratedImageCountService {
  static USER_IMAGE_COUNTS_CACHE_COLLECTION = 'userGeneratedImageCounts';
  static DEFAULT_CACHE_KEYS_FN: CacheKeysInputFn<UserGeneratedImageCount> = (imageCount) => [
    { name: 'id', value: imageCount.id },
    { name: 'userId', value: imageCount.userId, type: 'set' },
    {
      name: 'userId_date',
      value: `${imageCount.userId}_${imageCount.createdAt.toISOString().split('T')[0]}`
    }
  ];

  private readonly cacheService: CacheService;
  private readonly db: RAIDatabase;

  constructor(config: { cacheService: CacheService; db: RAIDatabase }) {
    this.cacheService = config.cacheService;
    this.db = config.db;
  }

  async getUserGeneratedImageCounts(
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
      orderBy = desc(userGeneratedImageCounts.createdAt)
    } = options;

    return await this.db
      .select()
      .from(userGeneratedImageCounts)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getUserGeneratedImageCountsByUserId(
    userId: string,
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
      orderBy = desc(userGeneratedImageCounts.createdAt)
    } = options;

    return await this.db
      .select()
      .from(userGeneratedImageCounts)
      .where(and(eq(userGeneratedImageCounts.userId, userId), where))
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getUserGeneratedImageCountByUserIdAndDate(userId: string, date: Date) {
    return await this.cacheService.cacheGet({
      collection: UserGeneratedImageCountService.USER_IMAGE_COUNTS_CACHE_COLLECTION,
      key: {
        name: `userId_date`,
        value: `${userId}_${date.toISOString().split('T')[0]}`
      },
      fn: async () =>
        (
          await this.db
            .select()
            .from(userGeneratedImageCounts)
            .where(
              and(
                eq(userGeneratedImageCounts.userId, userId),
                sql`${userGeneratedImageCounts.createdAt}::date = ${date}::date`
              )
            )
        ).at(0)
    });
  }

  async createUserGeneratedImageCount(data: CreateUserGeneratedImageCountData) {
    return await this.cacheService.cacheUpsert({
      collection: UserGeneratedImageCountService.USER_IMAGE_COUNTS_CACHE_COLLECTION,
      keys: UserGeneratedImageCountService.DEFAULT_CACHE_KEYS_FN,
      fn: async () =>
        (
          await this.db
            .insert(userGeneratedImageCounts)
            .values({
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0]
    });
  }

  async updateUserGeneratedImageCount(id: string, data: UpdateUserGeneratedImageCountData) {
    return await this.cacheService.cacheUpsert({
      collection: UserGeneratedImageCountService.USER_IMAGE_COUNTS_CACHE_COLLECTION,
      keys: UserGeneratedImageCountService.DEFAULT_CACHE_KEYS_FN,
      fn: async () =>
        (
          await this.db
            .update(userGeneratedImageCounts)
            .set({
              ...data,
              createdAt: undefined,
              updatedAt: new Date()
            })
            .where(eq(userGeneratedImageCounts.id, id))
            .returning()
        )[0],
      invalidateIterables: true
    });
  }

  async incrementUserGeneratedImageCount(userId: string) {
    console.log('Incrementing user generated image count for user:', userId);

    const todaysImages = await this.getUserGeneratedImageCountByUserIdAndDate(userId, new Date());

    if (todaysImages) {
      return await this.updateUserGeneratedImageCount(todaysImages.id, {
        count: todaysImages.count + 1
      });
    } else {
      return await this.createUserGeneratedImageCount({
        userId,
        count: 1
      });
    }
  }

  async decrementUserGeneratedImageCount(userId: string) {
    console.log('Decrementing user generated image count for user:', userId);

    const todaysImages = await this.getUserGeneratedImageCountByUserIdAndDate(userId, new Date());

    if (todaysImages) {
      return await this.updateUserGeneratedImageCount(todaysImages.id, {
        count: todaysImages.count > 0 ? todaysImages.count - 1 : 0
      });
    } else {
      return await this.createUserGeneratedImageCount({
        userId,
        count: 0
      });
    }
  }

  async deleteUserGeneratedImageCount(id: string) {
    return await this.cacheService.cacheDelete({
      collection: UserGeneratedImageCountService.USER_IMAGE_COUNTS_CACHE_COLLECTION,
      keys: UserGeneratedImageCountService.DEFAULT_CACHE_KEYS_FN,
      fn: async () =>
        (
          await this.db
            .delete(userGeneratedImageCounts)
            .where(eq(userGeneratedImageCounts.id, id))
            .returning()
        )[0]
    });
  }
}

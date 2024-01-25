import { userQueryCounts } from '@revelationsai/core/database/schema';
import type {
  CreateUserQueryCountData,
  UpdateUserQueryCountData,
  UserQueryCount
} from '@revelationsai/core/model/user/query-count';
import { SQL, and, desc, eq, sql } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';
import type { CacheKeysInputFn, CacheService } from '../cache';

export class UserQueryCountService {
  static USER_QUERY_COUNTS_CACHE_COLLECTION = 'userQueryCounts';
  static DEFAULT_CACHE_KEYS_FN: CacheKeysInputFn<UserQueryCount> = (queryCount) => [
    { name: 'id', value: queryCount.id },
    { name: 'userId', value: queryCount.userId, type: 'set' },
    {
      name: 'userId_date',
      value: `${queryCount.userId}_${queryCount.createdAt.toISOString().split('T')[0]}`
    }
  ];

  private readonly cacheService: CacheService;
  private readonly db: RAIDatabase;

  constructor(config: { cacheService: CacheService; db: RAIDatabase }) {
    this.cacheService = config.cacheService;
    this.db = config.db;
  }

  async getUserQueryCounts(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(userQueryCounts.createdAt) } = options;

    return await this.db
      .select()
      .from(userQueryCounts)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getUserQueryCountsByUserId(
    userId: string,
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(userQueryCounts.createdAt) } = options;

    return await this.db
      .select()
      .from(userQueryCounts)
      .where(and(eq(userQueryCounts.userId, userId), where))
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getUserQueryCountByUserIdAndDate(userId: string, date: Date) {
    return await this.cacheService.cacheGet({
      collection: UserQueryCountService.USER_QUERY_COUNTS_CACHE_COLLECTION,
      key: {
        name: `userId_date`,
        value: `${userId}_${date.toISOString().split('T')[0]}`
      },
      fn: async () =>
        (
          await this.db
            .select()
            .from(userQueryCounts)
            .where(
              and(
                eq(userQueryCounts.userId, userId),
                sql`${userQueryCounts.createdAt}::date = ${date}::date`
              )
            )
        ).at(0)
    });
  }

  async createUserQueryCount(data: CreateUserQueryCountData) {
    return await this.cacheService.cacheUpsert({
      collection: UserQueryCountService.USER_QUERY_COUNTS_CACHE_COLLECTION,
      keys: UserQueryCountService.DEFAULT_CACHE_KEYS_FN,
      fn: async () =>
        (
          await this.db
            .insert(userQueryCounts)
            .values({
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0]
    });
  }

  async updateUserQueryCount(id: string, data: UpdateUserQueryCountData) {
    return await this.cacheService.cacheUpsert({
      collection: UserQueryCountService.USER_QUERY_COUNTS_CACHE_COLLECTION,
      keys: UserQueryCountService.DEFAULT_CACHE_KEYS_FN,
      fn: async () =>
        (
          await this.db
            .update(userQueryCounts)
            .set({
              ...data,
              createdAt: undefined,
              updatedAt: new Date()
            })
            .where(eq(userQueryCounts.id, id))
            .returning()
        )[0],
      invalidateIterables: true
    });
  }

  async incrementUserQueryCount(userId: string) {
    console.log('Incrementing user query count for user:', userId);

    const todaysQueries = await this.getUserQueryCountByUserIdAndDate(userId, new Date());

    if (todaysQueries) {
      return await this.updateUserQueryCount(todaysQueries.id, {
        count: todaysQueries.count + 1
      });
    } else {
      return await this.createUserQueryCount({
        userId,
        count: 1
      });
    }
  }

  async decrementUserQueryCount(userId: string) {
    console.log('Decrementing user query count for user:', userId);

    const todaysQueries = await this.getUserQueryCountByUserIdAndDate(userId, new Date());

    if (todaysQueries) {
      return await this.updateUserQueryCount(todaysQueries.id, {
        count: todaysQueries.count > 0 ? todaysQueries.count - 1 : 0
      });
    } else {
      return await this.createUserQueryCount({
        userId,
        count: 0
      });
    }
  }

  async deleteUserQueryCount(id: string) {
    return await this.cacheService.cacheDelete({
      collection: UserQueryCountService.USER_QUERY_COUNTS_CACHE_COLLECTION,
      keys: UserQueryCountService.DEFAULT_CACHE_KEYS_FN,
      fn: async () =>
        (await this.db.delete(userQueryCounts).where(eq(userQueryCounts.id, id)).returning())[0]
    });
  }
}

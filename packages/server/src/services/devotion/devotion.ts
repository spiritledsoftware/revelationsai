import { devotions } from '@revelationsai/core/database/schema';
import type {
  CreateDevotionData,
  Devotion,
  UpdateDevotionData
} from '@revelationsai/core/model/devotion';
import { SQL, desc, eq, sql } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';
import type { CacheKeysInputFn, CacheService } from '../cache';

export class DevotionService {
  static DEVOTIONS_CACHE_COLLECTION = 'devotions';
  static defaultCacheKeysFn: CacheKeysInputFn<Devotion> = (devotion) => [
    { name: 'id', value: devotion.id },
    { name: 'date', value: devotion.createdAt.toISOString().split('T')[0] }
  ];
  static DEVOTIONS_CACHE_TTL_SECONDS = 60 * 60 * 24; // 1 day

  private readonly db: RAIDatabase;
  private readonly cacheService: CacheService;

  constructor(config: { db: RAIDatabase; cacheService: CacheService }) {
    this.db = config.db;
    this.cacheService = config.cacheService;
  }

  async getDevotions(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(devotions.createdAt) } = options;

    return await this.db
      .select()
      .from(devotions)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getDevotion(id: string) {
    return await this.cacheService.cacheGet({
      collection: DevotionService.DEVOTIONS_CACHE_COLLECTION,
      key: { name: 'id', value: id },
      fn: async () => (await this.db.select().from(devotions).where(eq(devotions.id, id))).at(0),
      expireSeconds: DevotionService.DEVOTIONS_CACHE_TTL_SECONDS
    });
  }

  async getDevotionOrThrow(id: string) {
    const devotion = await this.getDevotion(id);
    if (!devotion) {
      throw new Error(`Devotion with id ${id} not found`);
    }
    return devotion;
  }

  /**
   * Get the devotion for the given date.
   *
   * @param dateString YYYY-MM-DD
   * @returns
   */
  async getDevotionByCreatedDate(dateString: string) {
    return await this.cacheService.cacheGet({
      collection: DevotionService.DEVOTIONS_CACHE_COLLECTION,
      key: { name: 'date', value: dateString },
      fn: async () =>
        (
          await this.db
            .select()
            .from(devotions)
            .where(sql`${devotions.createdAt}::date = ${dateString}::date`)
        ).at(0),
      expireSeconds: DevotionService.DEVOTIONS_CACHE_TTL_SECONDS
    });
  }

  async createDevotion(data: CreateDevotionData) {
    return await this.cacheService.cacheUpsert({
      collection: DevotionService.DEVOTIONS_CACHE_COLLECTION,
      keys: DevotionService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .insert(devotions)
            .values({
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0],
      expireSeconds: DevotionService.DEVOTIONS_CACHE_TTL_SECONDS
    });
  }

  async updateDevotion(id: string, data: UpdateDevotionData) {
    return await this.cacheService.cacheUpsert({
      collection: DevotionService.DEVOTIONS_CACHE_COLLECTION,
      keys: DevotionService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .update(devotions)
            .set({
              ...data,
              createdAt: undefined,
              updatedAt: new Date()
            })
            .where(eq(devotions.id, id))
            .returning()
        )[0],
      expireSeconds: DevotionService.DEVOTIONS_CACHE_TTL_SECONDS
    });
  }

  async deleteDevotion(id: string) {
    return await this.cacheService.cacheDelete({
      collection: DevotionService.DEVOTIONS_CACHE_COLLECTION,
      keys: DevotionService.defaultCacheKeysFn,
      fn: async () => (await this.db.delete(devotions).where(eq(devotions.id, id)).returning())[0]
    });
  }
}

import { devotionReactions, devotions, users } from '@revelationsai/core/database/schema';
import type {
  CreateDevotionReactionData,
  DevotionReaction,
  UpdateDevotionReactionData
} from '@revelationsai/core/model/devotion/reaction';
import { SQL, and, desc, eq } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';
import type { CacheKeysInputFn, CacheService } from '../cache';

export class DevotionReactionService {
  static DEVOTION_REACTIONS_CACHE_COLLECTION = 'devotionReactions';
  static defaultCacheKeysFn: CacheKeysInputFn<DevotionReaction> = (reaction) => [
    { name: 'id', value: reaction.id },
    { name: 'devotionId', value: reaction.devotionId, type: 'set' },
    { name: 'devotionId_count', value: reaction.devotionId },
    {
      name: 'devotionId_reactionType',
      value: `${reaction.devotionId}_${reaction.reaction}`,
      type: 'set'
    },
    {
      name: 'devotionId_reactionType_count',
      value: `${reaction.devotionId}_${reaction.reaction}`
    }
  ];
  static DEVOTIONS_CACHE_TTL_SECONDS = 60 * 60 * 24; // 1 day

  private readonly db: RAIDatabase;
  private readonly cacheService: CacheService;

  constructor(config: { db: RAIDatabase; cacheService: CacheService }) {
    this.db = config.db;
    this.cacheService = config.cacheService;
  }

  async getDevotionReactions(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(devotionReactions.createdAt) } = options;

    return await this.db
      .select()
      .from(devotionReactions)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getDevotionReactionsWithInfo(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(devotionReactions.createdAt) } = options;

    return await this.db
      .select()
      .from(devotionReactions)
      .innerJoin(users, eq(devotionReactions.userId, users.id))
      .innerJoin(devotions, eq(devotionReactions.devotionId, devotions.id))
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getDevotionReaction(id: string) {
    return await this.cacheService.cacheGet({
      collection: DevotionReactionService.DEVOTION_REACTIONS_CACHE_COLLECTION,
      key: { name: 'id', value: id },
      fn: async () =>
        (await this.db.select().from(devotionReactions).where(eq(devotionReactions.id, id))).at(0),
      expireSeconds: DevotionReactionService.DEVOTIONS_CACHE_TTL_SECONDS
    });
  }

  async getDevotionReactionOrThrow(id: string) {
    const devotionImage = await this.getDevotionReaction(id);
    if (!devotionImage) {
      throw new Error(`DevotionReaction with id ${id} not found`);
    }
    return devotionImage;
  }

  async getDevotionReactionsByDevotionId(devotionId: string) {
    return await this.cacheService.cacheGet({
      collection: DevotionReactionService.DEVOTION_REACTIONS_CACHE_COLLECTION,
      key: { name: 'devotionId', value: devotionId, type: 'set' },
      fn: async () =>
        await this.db
          .select()
          .from(devotionReactions)
          .where(eq(devotionReactions.devotionId, devotionId)),
      expireSeconds: DevotionReactionService.DEVOTIONS_CACHE_TTL_SECONDS
    });
  }

  async getDevotionReactionCountByDevotionIdAndReactionType(
    devotionId: string,
    reactionType: (typeof devotionReactions.reaction.enumValues)[number]
  ) {
    return await this.cacheService.cacheGet({
      collection: DevotionReactionService.DEVOTION_REACTIONS_CACHE_COLLECTION,
      key: { name: 'devotionId_reactionType_count', value: `${devotionId}_${reactionType}` },
      fn: async () =>
        (
          await this.db
            .select()
            .from(devotionReactions)
            .where(
              and(
                eq(devotionReactions.devotionId, devotionId),
                eq(devotionReactions.reaction, reactionType)
              )
            )
        ).length,
      expireSeconds: DevotionReactionService.DEVOTIONS_CACHE_TTL_SECONDS
    });
  }

  async getDevotionReactionCounts(devotionId: string) {
    return await this.cacheService.cacheGet({
      collection: DevotionReactionService.DEVOTION_REACTIONS_CACHE_COLLECTION,
      key: { name: 'devotionId_count', value: devotionId },
      fn: async () => {
        const devoReactionCounts: {
          [key in (typeof devotionReactions.reaction.enumValues)[number]]?: number;
        } = {};
        for (const reactionType of devotionReactions.reaction.enumValues) {
          const reactionCount = await this.getDevotionReactionCountByDevotionIdAndReactionType(
            devotionId,
            reactionType
          );
          devoReactionCounts[reactionType] = reactionCount;
        }
        return devoReactionCounts;
      },
      expireSeconds: DevotionReactionService.DEVOTIONS_CACHE_TTL_SECONDS
    });
  }

  async createDevotionReaction(data: CreateDevotionReactionData) {
    return await this.cacheService.cacheUpsert({
      collection: DevotionReactionService.DEVOTION_REACTIONS_CACHE_COLLECTION,
      keys: DevotionReactionService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .insert(devotionReactions)
            .values({
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0],
      expireSeconds: DevotionReactionService.DEVOTIONS_CACHE_TTL_SECONDS
    });
  }

  async updateDevotionReaction(id: string, data: UpdateDevotionReactionData) {
    return await this.cacheService.cacheUpsert({
      collection: DevotionReactionService.DEVOTION_REACTIONS_CACHE_COLLECTION,
      keys: DevotionReactionService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .update(devotionReactions)
            .set({
              ...data,
              createdAt: undefined,
              updatedAt: new Date()
            })
            .where(eq(devotionReactions.id, id))
            .returning()
        )[0],
      expireSeconds: DevotionReactionService.DEVOTIONS_CACHE_TTL_SECONDS,
      invalidateIterables: true
    });
  }

  async deleteDevotionReaction(id: string) {
    return await this.cacheService.cacheDelete({
      collection: DevotionReactionService.DEVOTION_REACTIONS_CACHE_COLLECTION,
      keys: DevotionReactionService.defaultCacheKeysFn,
      fn: async () =>
        (await this.db.delete(devotionReactions).where(eq(devotionReactions.id, id)).returning())[0]
    });
  }
}

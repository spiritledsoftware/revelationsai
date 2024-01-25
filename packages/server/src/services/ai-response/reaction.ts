import { aiResponseReactions, aiResponses, users } from '@revelationsai/core/database/schema';
import type {
  AiResponseReaction,
  CreateAiResponseReactionData,
  UpdateAiResponseReactionData
} from '@revelationsai/core/model/ai-response/reaction';
import { SQL, and, desc, eq } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';
import type { CacheKeysInputFn, CacheService } from '../cache';

export class AiResponseReactionService {
  static AI_RESPONSE_REACTIONS_CACHE_COLLECTION = 'aiResponseReactions';
  static defaultCacheKeysFn: CacheKeysInputFn<AiResponseReaction> = (reaction) => [
    { name: 'id', value: reaction.id },
    { name: 'aiResponseId', value: reaction.aiResponseId, type: 'set' },
    { name: 'aiResponseId_count', value: reaction.aiResponseId },
    {
      name: 'aiResponseId_reactionType',
      value: `${reaction.aiResponseId}_${reaction.reaction}`,
      type: 'set'
    },
    {
      name: 'aiResponseId_reactionType_count',
      value: `${reaction.aiResponseId}_${reaction.reaction}`
    }
  ];

  private readonly cacheService: CacheService;
  private readonly db: RAIDatabase;

  constructor(config: { cacheService: CacheService; db: RAIDatabase }) {
    this.cacheService = config.cacheService;
    this.db = config.db;
  }

  async getAiResponseReactions(
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
      orderBy = desc(aiResponseReactions.createdAt)
    } = options;

    return await this.db
      .select()
      .from(aiResponseReactions)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getAiResponseReactionsWithInfo(
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
      orderBy = desc(aiResponseReactions.createdAt)
    } = options;

    return await this.db
      .select()
      .from(aiResponseReactions)
      .innerJoin(users, eq(aiResponseReactions.userId, users.id))
      .innerJoin(aiResponses, eq(aiResponseReactions.aiResponseId, aiResponses.id))
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getAiResponseReaction(id: string) {
    return await this.cacheService.cacheGet({
      collection: AiResponseReactionService.AI_RESPONSE_REACTIONS_CACHE_COLLECTION,
      key: { name: 'id', value: id },
      fn: async () =>
        (await this.db.select().from(aiResponseReactions).where(eq(aiResponseReactions.id, id))).at(
          0
        )
    });
  }

  async getAiResponseReactionOrThrow(id: string) {
    const aiResponseImage = await this.getAiResponseReaction(id);
    if (!aiResponseImage) {
      throw new Error(`AiResponseReaction with id ${id} not found`);
    }
    return aiResponseImage;
  }

  async getAiResponseReactionsByAiResponseId(aiResponseId: string) {
    return await this.cacheService.cacheGet({
      collection: AiResponseReactionService.AI_RESPONSE_REACTIONS_CACHE_COLLECTION,
      key: { name: 'aiResponseId', value: aiResponseId, type: 'set' },
      fn: async () =>
        await this.db
          .select()
          .from(aiResponseReactions)
          .where(eq(aiResponseReactions.aiResponseId, aiResponseId))
    });
  }

  async getAiResponseReactionCountByAiResponseIdAndReactionType(
    aiResponseId: string,
    reactionType: (typeof aiResponseReactions.reaction.enumValues)[number]
  ) {
    return await this.cacheService.cacheGet({
      collection: AiResponseReactionService.AI_RESPONSE_REACTIONS_CACHE_COLLECTION,
      key: { name: 'aiResponseId_reactionType_count', value: `${aiResponseId}_${reactionType}` },
      fn: async () =>
        (
          await this.db
            .select()
            .from(aiResponseReactions)
            .where(
              and(
                eq(aiResponseReactions.aiResponseId, aiResponseId),
                eq(aiResponseReactions.reaction, reactionType)
              )
            )
        ).length
    });
  }

  async getAiResponseReactionCounts(aiResponseId: string) {
    return await this.cacheService.cacheGet({
      collection: AiResponseReactionService.AI_RESPONSE_REACTIONS_CACHE_COLLECTION,
      key: { name: 'aiResponseId_count', value: aiResponseId },
      fn: async () => {
        const devoReactionCounts: {
          [key in (typeof aiResponseReactions.reaction.enumValues)[number]]?: number;
        } = {};
        for (const reactionType of aiResponseReactions.reaction.enumValues) {
          const reactionCount = await this.getAiResponseReactionCountByAiResponseIdAndReactionType(
            aiResponseId,
            reactionType
          );
          devoReactionCounts[reactionType] = reactionCount;
        }
        return devoReactionCounts;
      }
    });
  }

  async createAiResponseReaction(data: CreateAiResponseReactionData) {
    return await this.cacheService.cacheUpsert({
      collection: AiResponseReactionService.AI_RESPONSE_REACTIONS_CACHE_COLLECTION,
      keys: AiResponseReactionService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .insert(aiResponseReactions)
            .values({
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0]
    });
  }

  async updateAiResponseReaction(id: string, data: UpdateAiResponseReactionData) {
    return await this.cacheService.cacheUpsert({
      collection: AiResponseReactionService.AI_RESPONSE_REACTIONS_CACHE_COLLECTION,
      keys: AiResponseReactionService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .update(aiResponseReactions)
            .set({
              ...data,
              updatedAt: new Date()
            })
            .where(eq(aiResponseReactions.id, id))
            .returning()
        )[0],
      invalidateIterables: true
    });
  }

  async deleteAiResponseReaction(id: string) {
    return await this.cacheService.cacheDelete({
      collection: AiResponseReactionService.AI_RESPONSE_REACTIONS_CACHE_COLLECTION,
      keys: AiResponseReactionService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .delete(aiResponseReactions)
            .where(eq(aiResponseReactions.id, id))
            .returning()
        )[0]
    });
  }
}

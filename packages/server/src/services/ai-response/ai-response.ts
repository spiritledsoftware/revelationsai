import { aiResponses } from '@revelationsai/core/database/schema';
import type {
  AiResponse,
  CreateAiResponseData,
  UpdateAiResponseData
} from '@revelationsai/core/model/ai-response';
import { SQL, desc, eq } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';
import type { CacheKeysInputFn, CacheService } from '../cache';

export class AiResponseService {
  static AI_RESPONSES_CACHE_COLLECTION = 'aiResponses';
  static defaultCacheKeysFn: CacheKeysInputFn<AiResponse> = (aiResponse) => [
    { name: 'id', value: aiResponse.id },
    { name: 'userId', value: aiResponse.userId, type: 'set' },
    { name: 'chatId', value: aiResponse.chatId, type: 'set' },
    { name: 'userMessageId', value: aiResponse.userMessageId, type: 'set' }
  ];

  private readonly cacheService: CacheService;
  private readonly db: RAIDatabase;

  constructor(config: { cacheService: CacheService; db: RAIDatabase }) {
    this.cacheService = config.cacheService;
    this.db = config.db;
  }

  async getAiResponses(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(aiResponses.createdAt) } = options;

    return await this.db
      .select()
      .from(aiResponses)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
  }

  async getAiResponse(id: string) {
    return await this.cacheService.cacheGet({
      collection: AiResponseService.AI_RESPONSES_CACHE_COLLECTION,
      key: { name: 'id', value: id },
      fn: async () => (await this.db.select().from(aiResponses).where(eq(aiResponses.id, id))).at(0)
    });
  }

  async getAiResponseOrThrow(id: string) {
    const aiResponse = await this.getAiResponse(id);
    if (!aiResponse) {
      throw new Error(`AiResponse with id ${id} not found`);
    }
    return aiResponse;
  }

  async getAiResponsesByUserMessageId(userMessageId: string) {
    return await this.cacheService.cacheGet({
      collection: AiResponseService.AI_RESPONSES_CACHE_COLLECTION,
      key: { name: 'userMessageId', value: userMessageId, type: 'set' },
      fn: async () =>
        await this.db
          .select()
          .from(aiResponses)
          .where(eq(aiResponses.userMessageId, userMessageId))
          .orderBy(desc(aiResponses.createdAt))
    });
  }

  async createAiResponse(data: CreateAiResponseData) {
    return await this.cacheService.cacheUpsert({
      collection: AiResponseService.AI_RESPONSES_CACHE_COLLECTION,
      keys: AiResponseService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .insert(aiResponses)
            .values({
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0]
    });
  }

  async updateAiResponse(id: string, data: UpdateAiResponseData) {
    return await this.cacheService.cacheUpsert({
      collection: AiResponseService.AI_RESPONSES_CACHE_COLLECTION,
      keys: AiResponseService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .update(aiResponses)
            .set({
              ...data,
              createdAt: undefined,
              updatedAt: new Date()
            })
            .where(eq(aiResponses.id, id))
            .returning()
        )[0],
      invalidateIterables: true
    });
  }

  async deleteAiResponse(id: string) {
    return await this.cacheService.cacheDelete({
      collection: AiResponseService.AI_RESPONSES_CACHE_COLLECTION,
      keys: AiResponseService.defaultCacheKeysFn,
      fn: async () =>
        (await this.db.delete(aiResponses).where(eq(aiResponses.id, id)).returning())[0]
    });
  }
}

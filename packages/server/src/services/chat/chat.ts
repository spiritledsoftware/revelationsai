import { chats } from '@revelationsai/core/database/schema';
import type { Chat, CreateChatData, UpdateChatData } from '@revelationsai/core/model/chat';
import { SQL, desc, eq, sql } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';
import type { CacheKeysInputFn, CacheService } from '../cache';

export class ChatService {
  static CHATS_CACHE_COLLECTION = 'chats';
  static defaultCacheKeysFn: CacheKeysInputFn<Chat> = (chat) => [
    { name: 'id', value: chat.id },
    { name: 'userId', value: chat.userId }
  ];

  private readonly cacheService: CacheService;
  private readonly db: RAIDatabase;

  constructor(config: { cacheService: CacheService; db: RAIDatabase }) {
    this.cacheService = config.cacheService;
    this.db = config.db;
  }

  async getChats(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(chats.createdAt) } = options;

    return await this.db
      .select()
      .from(chats)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getChat(id: string) {
    return await this.cacheService.cacheGet({
      collection: ChatService.CHATS_CACHE_COLLECTION,
      key: { name: 'id', value: id },
      fn: async () => (await this.db.select().from(chats).where(eq(chats.id, id))).at(0)
    });
  }

  async getChatOrThrow(id: string) {
    const chat = await this.getChat(id);
    if (!chat) {
      throw new Error(`Chat with id ${id} not found`);
    }
    return chat;
  }

  async createChat(data: CreateChatData) {
    return await this.cacheService.cacheUpsert({
      collection: ChatService.CHATS_CACHE_COLLECTION,
      keys: ChatService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .insert(chats)
            .values({
              customName: data.name && data.name != 'New Chat' ? true : false,
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0]
    });
  }

  async updateChat(id: string, data: UpdateChatData) {
    return await this.cacheService.cacheUpsert({
      collection: ChatService.CHATS_CACHE_COLLECTION,
      keys: ChatService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .update(chats)
            .set({
              customName: sql`${chats.customName} OR ${
                data.name && data.name != 'New Chat' ? true : false
              }`,
              ...data,
              createdAt: undefined,
              updatedAt: new Date()
            })
            .where(eq(chats.id, id))
            .returning()
        )[0],
      invalidateIterables: true
    });
  }

  async deleteChat(id: string) {
    return await this.cacheService.cacheDelete({
      collection: ChatService.CHATS_CACHE_COLLECTION,
      keys: ChatService.defaultCacheKeysFn,
      fn: async () => (await this.db.delete(chats).where(eq(chats.id, id)).returning())[0]
    });
  }
}

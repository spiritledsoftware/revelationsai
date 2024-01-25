import { userMessages, users } from '@revelationsai/core/database/schema';
import type {
  CreateUserMessageData,
  UpdateUserMessageData,
  UserMessage
} from '@revelationsai/core/model/user/message';
import { SQL, and, desc, eq, like, not, sql } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';
import type { CacheKeysInputFn, CacheService } from '../cache';

export class UserMessageService {
  static USER_MESSAGES_CACHE_COLLECTION = 'userMessages';
  static DEFAULT_CACHE_KEYS_FN: CacheKeysInputFn<UserMessage> = (message) => [
    { name: 'id', value: message.id },
    { name: 'userId', value: message.userId, type: 'set' },
    { name: 'chatId', value: message.chatId, type: 'set' },
    { name: 'chatId_text', value: `${message.chatId}_${message.text}`, type: 'set' }
  ];

  private readonly cacheService: CacheService;
  private readonly db: RAIDatabase;

  constructor(config: { cacheService: CacheService; db: RAIDatabase }) {
    this.cacheService = config.cacheService;
    this.db = config.db;
  }

  async getUserMessages(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(userMessages.createdAt) } = options;

    return await this.db
      .select()
      .from(userMessages)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getUserMessage(id: string) {
    return await this.cacheService.cacheGet({
      collection: UserMessageService.USER_MESSAGES_CACHE_COLLECTION,
      key: { name: 'id', value: id },
      fn: async () =>
        (await this.db.select().from(userMessages).where(eq(userMessages.id, id))).at(0)
    });
  }

  async getUserMessageOrThrow(id: string) {
    const userMessage = await this.getUserMessage(id);
    if (!userMessage) {
      throw new Error(`UserMessage with id ${id} not found`);
    }
    return userMessage;
  }

  async getUserMessagesByChatId(chatId: string) {
    return await this.cacheService.cacheGet({
      collection: UserMessageService.USER_MESSAGES_CACHE_COLLECTION,
      key: { name: 'chatId', value: chatId, type: 'set' },
      fn: async () =>
        await this.db
          .select()
          .from(userMessages)
          .where(eq(userMessages.chatId, chatId))
          .orderBy(desc(userMessages.createdAt))
    });
  }

  async getUserMessagesByChatIdAndText(chatId: string, text: string) {
    return await this.cacheService.cacheGet({
      collection: UserMessageService.USER_MESSAGES_CACHE_COLLECTION,
      key: { name: 'chatId_text', value: `${chatId}_${text}`, type: 'set' },
      fn: async () =>
        await this.db
          .select()
          .from(userMessages)
          .where(and(eq(userMessages.chatId, chatId), eq(userMessages.text, text)))
          .orderBy(desc(userMessages.createdAt))
    });
  }

  async createUserMessage(data: CreateUserMessageData) {
    return await this.cacheService.cacheUpsert({
      collection: UserMessageService.USER_MESSAGES_CACHE_COLLECTION,
      keys: UserMessageService.DEFAULT_CACHE_KEYS_FN,
      fn: async () =>
        (
          await this.db
            .insert(userMessages)
            .values({
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0]
    });
  }

  async updateUserMessage(id: string, data: UpdateUserMessageData) {
    return await this.cacheService.cacheUpsert({
      collection: UserMessageService.USER_MESSAGES_CACHE_COLLECTION,
      keys: UserMessageService.DEFAULT_CACHE_KEYS_FN,
      fn: async () =>
        (
          await this.db
            .update(userMessages)
            .set({
              ...data,
              createdAt: undefined,
              updatedAt: new Date()
            })
            .where(eq(userMessages.id, id))
            .returning()
        )[0],
      invalidateIterables: true
    });
  }

  async deleteUserMessage(id: string) {
    return await this.cacheService.cacheDelete({
      collection: UserMessageService.USER_MESSAGES_CACHE_COLLECTION,
      keys: UserMessageService.DEFAULT_CACHE_KEYS_FN,
      fn: async () =>
        (await this.db.delete(userMessages).where(eq(userMessages.id, id)).returning())[0]
    });
  }

  async getMostAskedUserMessages(count: number) {
    return await this.db
      .select({
        text: userMessages.text,
        count: sql`COUNT(*)`
      })
      .from(userMessages)
      .innerJoin(users, eq(userMessages.userId, users.id))
      .where(not(like(users.email, '%@revelationsai.com'))) // Exclude internal accounts
      .groupBy(userMessages.text)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(count);
  }
}

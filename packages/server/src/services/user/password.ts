import { userPasswords } from '@revelationsai/core/database/schema';
import type {
  CreateUserPasswordData,
  UpdateUserPasswordData
} from '@revelationsai/core/model/user/password';
import { SQL, desc, eq } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';

export class UserPasswordService {
  private readonly db: RAIDatabase;

  constructor(config: { db: RAIDatabase }) {
    this.db = config.db;
  }

  async getUserPasswords(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(userPasswords.createdAt) } = options;

    return await this.db
      .select()
      .from(userPasswords)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getUserPasswordByUserId(userId: string) {
    return (await this.db.select().from(userPasswords).where(eq(userPasswords.userId, userId)))[0];
  }

  async createUserPassword(data: CreateUserPasswordData) {
    return (
      await this.db
        .insert(userPasswords)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning()
    )[0];
  }

  async updateUserPassword(id: string, data: UpdateUserPasswordData) {
    return (
      await this.db
        .update(userPasswords)
        .set({
          ...data,
          createdAt: undefined,
          updatedAt: new Date()
        })
        .where(eq(userPasswords.id, id))
        .returning()
    )[0];
  }

  async updateUserPasswordByUserId(userId: string, data: UpdateUserPasswordData) {
    return (
      await this.db
        .update(userPasswords)
        .set({
          ...data,
          createdAt: undefined,
          updatedAt: new Date()
        })
        .where(eq(userPasswords.userId, userId))
        .returning()
    )[0];
  }
}

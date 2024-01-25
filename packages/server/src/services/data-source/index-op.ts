import { indexOperations } from '@revelationsai/core/database/schema';
import type {
  CreateIndexOperationData,
  UpdateIndexOperationData
} from '@revelationsai/core/model/data-source/index-op';
import { SQL, desc, eq } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';

export class IndexOperationService {
  private readonly db: RAIDatabase;

  constructor(config: { db: RAIDatabase }) {
    this.db = config.db;
  }

  async getIndexOperations(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(indexOperations.createdAt) } = options;

    return await this.db
      .select()
      .from(indexOperations)
      .limit(limit)
      .offset(offset)
      .where(where)
      .orderBy(orderBy);
  }

  async getIndexOperation(id: string) {
    return (await this.db.select().from(indexOperations).where(eq(indexOperations.id, id))).at(0);
  }

  async getIndexOperationOrThrow(id: string) {
    const indexOperation = await this.getIndexOperation(id);
    if (!indexOperation) {
      throw new Error(`IndexOperation with id ${id} not found`);
    }
    return indexOperation;
  }

  async createIndexOperation(data: CreateIndexOperationData) {
    return (
      await this.db
        .insert(indexOperations)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning()
    )[0];
  }

  async updateIndexOperation(id: string, data: UpdateIndexOperationData) {
    return (
      await this.db
        .update(indexOperations)
        .set({
          ...data,
          createdAt: undefined,
          updatedAt: new Date()
        })
        .where(eq(indexOperations.id, id))
        .returning()
    )[0];
  }

  async deleteIndexOperation(id: string) {
    return (await this.db.delete(indexOperations).where(eq(indexOperations.id, id)).returning())[0];
  }
}

import { dataSources } from '@revelationsai/core/database/schema';
import type {
  CreateDataSourceData,
  DataSource,
  UpdateDataSourceData
} from '@revelationsai/core/model/data-source';
import { SQL, desc, eq } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';
import type { CacheKeysInputFn, CacheService } from '../cache';
import type { VectorDatabaseService } from '../vector-db';

export class DataSourceService {
  static DATA_SOURCE_CACHE_COLLECTION = 'dataSources';
  static defaultCacheKeysFn: CacheKeysInputFn<DataSource> = (dataSource) => [
    { name: 'id', value: dataSource.id }
  ];
  static DATA_SOURCES_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

  private readonly db: RAIDatabase;
  private readonly cacheService: CacheService;
  private readonly vectorDatabaseService: VectorDatabaseService;

  constructor(config: {
    db: RAIDatabase;
    cacheService: CacheService;
    vectorDatabaseService: VectorDatabaseService;
  }) {
    this.db = config.db;
    this.cacheService = config.cacheService;
    this.vectorDatabaseService = config.vectorDatabaseService;
  }

  async getDataSources(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(dataSources.createdAt) } = options;

    return await this.db
      .select()
      .from(dataSources)
      .limit(limit)
      .offset(offset)
      .where(where)
      .orderBy(orderBy);
  }

  async getDataSource(id: string) {
    return await this.cacheService.cacheGet({
      collection: DataSourceService.DATA_SOURCE_CACHE_COLLECTION,
      key: { name: 'id', value: id },
      fn: async () =>
        (await this.db.select().from(dataSources).where(eq(dataSources.id, id))).at(0),
      expireSeconds: DataSourceService.DATA_SOURCES_CACHE_TTL_SECONDS
    });
  }

  async getDataSourceOrThrow(id: string) {
    const indexOperation = await this.getDataSource(id);
    if (!indexOperation) {
      throw new Error(`DataSource with id ${id} not found`);
    }
    return indexOperation;
  }

  async createDataSource(data: CreateDataSourceData) {
    return await this.cacheService.cacheUpsert({
      collection: DataSourceService.DATA_SOURCE_CACHE_COLLECTION,
      keys: DataSourceService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .insert(dataSources)
            .values({
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0],
      expireSeconds: DataSourceService.DATA_SOURCES_CACHE_TTL_SECONDS
    });
  }

  async updateDataSource(id: string, data: UpdateDataSourceData) {
    return await this.cacheService.cacheUpsert({
      collection: DataSourceService.DATA_SOURCE_CACHE_COLLECTION,
      keys: DataSourceService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .update(dataSources)
            .set({
              ...data,
              createdAt: undefined,
              updatedAt: new Date()
            })
            .where(eq(dataSources.id, id))
            .returning()
        )[0],
      expireSeconds: DataSourceService.DATA_SOURCES_CACHE_TTL_SECONDS,
      invalidateIterables: true
    });
  }

  async updateDataSourceRelatedDocuments(dataSourceId: string, dataSource: DataSource) {
    const vectorDb = await this.vectorDatabaseService.getDocumentVectorStore();
    await vectorDb.transaction(async (client) => {
      return await client.query(
        `UPDATE ${vectorDb.tableName} 
      SET metadata = metadata || $1::jsonb
      WHERE (
        metadata->>'dataSourceId' = $2
      );`,
        [
          JSON.stringify({
            ...dataSource.metadata,
            dataSourceId: dataSource.id
          }),
          dataSourceId
        ]
      );
    });
  }

  async deleteDataSource(id: string) {
    return await this.cacheService.cacheDelete({
      collection: DataSourceService.DATA_SOURCE_CACHE_COLLECTION,
      keys: DataSourceService.defaultCacheKeysFn,
      fn: async () =>
        (await this.db.delete(dataSources).where(eq(dataSources.id, id)).returning())[0]
    });
  }

  async deleteDataSourceRelatedDocuments(dataSourceId: string) {
    const vectorDb = await this.vectorDatabaseService.getDocumentVectorStore();
    await vectorDb.transaction(async (client) => {
      return await client.query(
        `DELETE FROM ${vectorDb.tableName} 
      WHERE (
        metadata->>'dataSourceId' = $1
      );`,
        [dataSourceId]
      );
    });
  }
}

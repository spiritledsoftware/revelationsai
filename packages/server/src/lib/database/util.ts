import envConfig from '@revelationsai/core/configs/env';
import * as schema from '@revelationsai/core/database/schema';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { RAIDatabaseConfig } from './config';

export async function transaction<T>(
  config: RAIDatabaseConfig,
  fn: (
    db: PgTransaction<NeonQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>
  ) => Promise<T>
): Promise<T> {
  const client = config.getWsClient();
  try {
    await client.connect();
    const drizzle = drizzleWs(client, { schema, logger: envConfig.isLocal });
    return await drizzle.transaction(fn);
  } finally {
    await client.end();
  }
}

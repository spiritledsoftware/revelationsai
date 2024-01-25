import databaseConfig from '@revelationsai/core/configs/database';
import { RAIDatabaseConfig } from '@revelationsai/server/lib/database/config';
import { withReplicas } from 'drizzle-orm/pg-core';

export const readWriteDatabaseConfig = new RAIDatabaseConfig({
  connectionString: databaseConfig.readWriteUrl,
  readOnly: false
});

export const readOnlyDatabaseConfig =
  databaseConfig.readOnlyUrl && databaseConfig.readWriteUrl !== databaseConfig.readOnlyUrl
    ? new RAIDatabaseConfig({
        connectionString: databaseConfig.readOnlyUrl,
        readOnly: true
      })
    : undefined;

export const db = readOnlyDatabaseConfig
  ? withReplicas(readWriteDatabaseConfig.database, [readOnlyDatabaseConfig.database])
  : readWriteDatabaseConfig.database;
export default db;

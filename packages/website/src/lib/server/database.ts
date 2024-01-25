import { building } from '$app/environment';
import databaseConfig from '@revelationsai/core/configs/database';
import { RAIDatabaseConfig, type RAIDatabase } from '@revelationsai/server/lib/database/config';
import { withReplicas } from 'drizzle-orm/pg-core';

export const readWriteDatabaseConfig = !building
	? new RAIDatabaseConfig({
			connectionString: databaseConfig.readWriteUrl,
			readOnly: false
		})
	: undefined;

export const readOnlyDatabaseConfig =
	!building &&
	databaseConfig.readOnlyUrl &&
	databaseConfig.readWriteUrl !== databaseConfig.readOnlyUrl
		? new RAIDatabaseConfig({
				connectionString: databaseConfig.readOnlyUrl,
				readOnly: true
			})
		: undefined;

export const db = (
	readWriteDatabaseConfig
		? readOnlyDatabaseConfig
			? withReplicas(readWriteDatabaseConfig.database, [readOnlyDatabaseConfig.database])
			: readWriteDatabaseConfig.database
		: undefined
) as RAIDatabase;
export default db;

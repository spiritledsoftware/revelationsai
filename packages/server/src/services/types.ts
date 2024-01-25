import type { Redis } from '@upstash/redis';
import type { RAIDatabase } from '../lib/database/config';

export type DatabaseConfig = {
  db: RAIDatabase;
};

export type CacheDatabaseConfig = DatabaseConfig & {
  cache: Redis | null;
};

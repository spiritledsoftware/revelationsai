import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: 'packages/core/src/database/schema.ts',
  dialect: 'postgresql',
  out: 'migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});

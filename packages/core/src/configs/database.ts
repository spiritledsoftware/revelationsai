export const config = {
  readOnlyUrl: process.env.DATABASE_READONLY_URL || process.env.DATABASE_READWRITE_URL!,
  readWriteUrl: process.env.DATABASE_READWRITE_URL!
};

export default config;

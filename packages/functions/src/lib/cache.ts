import upstashRedisConfig from '@revelationsai/core/configs/upstash-redis';
import { Redis } from '@upstash/redis';
import { UpstashRedisCache } from 'langchain/cache/upstash_redis';

/**
 * Redis cache instance.
 * @type {Redis | undefined}
 */
export const cache =
  upstashRedisConfig.url && upstashRedisConfig.token
    ? new Redis({
        url: upstashRedisConfig.url,
        token: upstashRedisConfig.token
      })
    : undefined;

export const llmCache =
  upstashRedisConfig.url && upstashRedisConfig.token
    ? new UpstashRedisCache({
        config: {
          url: upstashRedisConfig.url,
          token: upstashRedisConfig.token
        }
      })
    : undefined;

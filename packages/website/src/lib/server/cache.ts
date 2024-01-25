import upstashRedisConfig from '@revelationsai/core/configs/upstash-redis';
import { Redis } from '@upstash/redis';

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

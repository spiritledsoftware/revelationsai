import { AiResponseService } from '@revelationsai/server/services/ai-response';
import { AiResponseReactionService } from '@revelationsai/server/services/ai-response/reaction';
import { CacheService } from '@revelationsai/server/services/cache';
import { ChatService } from '@revelationsai/server/services/chat';
import { ChatMessageService } from '@revelationsai/server/services/chat/message';
import { DataSourceService } from '@revelationsai/server/services/data-source';
import { IndexOperationService } from '@revelationsai/server/services/data-source/index-op';
import { DevotionService } from '@revelationsai/server/services/devotion';
import { DevotionImageService } from '@revelationsai/server/services/devotion/image';
import { DevotionReactionService } from '@revelationsai/server/services/devotion/reaction';
import { RoleService } from '@revelationsai/server/services/role';
import { SessionService } from '@revelationsai/server/services/session';
import { SourceDocumentService } from '@revelationsai/server/services/source-document';
import { UserService } from '@revelationsai/server/services/user';
import { UserGeneratedImageService } from '@revelationsai/server/services/user/generated-image';
import { UserGeneratedImageCountService } from '@revelationsai/server/services/user/image-count';
import { UserMessageService } from '@revelationsai/server/services/user/message';
import { UserPasswordService } from '@revelationsai/server/services/user/password';
import { UserQueryCountService } from '@revelationsai/server/services/user/query-count';
import { VectorDatabaseService } from '@revelationsai/server/services/vector-db';
import { cache } from './cache';
import db from './database';

// Cache
export const cacheService = new CacheService({
  cache
});

// Vector DB
export const vectorDatabaseService = new VectorDatabaseService();

// AI Responses
export const aiResponseService = new AiResponseService({
  cacheService,
  db
});
export const aiResponseReactionService = new AiResponseReactionService({
  cacheService,
  db
});

// Chats
export const chatService = new ChatService({
  cacheService,
  db
});
export const chatMessageService = new ChatMessageService({
  db
});

// Data Sources
export const dataSourceService = new DataSourceService({
  cacheService,
  db,
  vectorDatabaseService
});
export const indexOperationService = new IndexOperationService({
  db
});

// Devotions
export const devotionService = new DevotionService({
  cacheService,
  db
});
export const devotionImageService = new DevotionImageService({
  cacheService,
  db
});
export const devotionReactionService = new DevotionReactionService({
  cacheService,
  db
});

// Users
export const userService = new UserService({
  cacheService,
  db
});
export const userQueryCountService = new UserQueryCountService({
  cacheService,
  db
});
export const userGeneratedImageCountService = new UserGeneratedImageCountService({
  cacheService,
  db
});
export const userMessageService = new UserMessageService({
  cacheService,
  db
});
export const userGeneratedImageService = new UserGeneratedImageService({
  cacheService,
  db
});
export const userPasswordService = new UserPasswordService({
  db
});

// Roles
export const roleService = new RoleService({
  userService,
  cacheService,
  db
});

// Sessions
export const sessionService = new SessionService({
  userService,
  roleService,
  userGeneratedImageCountService,
  userQueryCountService
});

// Source Documents
export const sourceDocumentService = new SourceDocumentService({
  vectorDatabaseService,
  db
});

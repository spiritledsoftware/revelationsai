import { roles, users, usersToRoles } from '@revelationsai/core/database/schema';
import type {
  CreateUserData,
  UpdateUserData,
  User,
  UserWithRoles
} from '@revelationsai/core/model/user';
import { SQL, desc, eq, sql } from 'drizzle-orm';
import type { RAIDatabase } from '../../lib/database/config';
import type { CacheKeysInputFn, CacheService } from '../cache';

export class UserService {
  static USERS_CACHE_COLLECTION = 'users';
  static DEFAULT_CACHE_KEYS_FN: CacheKeysInputFn<User> = (user) => [
    { name: 'id', value: user.id },
    { name: 'email', value: user.email },
    { name: 'stripeCustomerId', value: user.stripeCustomerId }
  ];

  private readonly cacheService: CacheService;
  private readonly db: RAIDatabase;

  constructor(config: { cacheService: CacheService; db: RAIDatabase }) {
    this.cacheService = config.cacheService;
    this.db = config.db;
  }

  async getUsers(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(users.createdAt) } = options;
    return await this.db
      .select()
      .from(users)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getUser(id: string) {
    return await this.cacheService.cacheGet({
      collection: UserService.USERS_CACHE_COLLECTION,
      key: { name: 'id', value: id },
      fn: async () => (await this.db.select().from(users).where(eq(users.id, id))).at(0)
    });
  }

  async getUserOrThrow(id: string) {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    return user;
  }

  async getUserByEmail(email: string) {
    return await this.cacheService.cacheGet({
      collection: UserService.USERS_CACHE_COLLECTION,
      key: { name: 'email', value: email },
      fn: async () => (await this.db.select().from(users).where(eq(users.email, email))).at(0)
    });
  }

  async getUserByEmailOrThrow(email: string) {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }
    return user;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string) {
    return await this.cacheService.cacheGet({
      collection: UserService.USERS_CACHE_COLLECTION,
      key: { name: 'stripeCustomerId', value: stripeCustomerId },
      fn: async () =>
        (await this.db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId))).at(
          0
        )
    });
  }

  async createUser(data: CreateUserData) {
    return await this.cacheService.cacheUpsert({
      collection: UserService.USERS_CACHE_COLLECTION,
      keys: UserService.DEFAULT_CACHE_KEYS_FN,
      fn: async () => {
        return (
          await this.db
            .insert(users)
            .values({
              hasCustomImage: data.image ? true : false,
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0];
      }
    });
  }

  async updateUser(id: string, data: UpdateUserData) {
    return await this.cacheService.cacheUpsert({
      collection: UserService.USERS_CACHE_COLLECTION,
      keys: UserService.DEFAULT_CACHE_KEYS_FN,
      fn: async () =>
        (
          await this.db
            .update(users)
            .set({
              hasCustomImage: sql`${users.hasCustomImage} OR ${data.image ? true : false}`,
              ...data,
              createdAt: undefined,
              updatedAt: new Date()
            })
            .where(eq(users.id, id))
            .returning()
        )[0]
    });
  }

  async deleteUser(id: string) {
    return await this.cacheService.cacheDelete({
      collection: UserService.USERS_CACHE_COLLECTION,
      keys: UserService.DEFAULT_CACHE_KEYS_FN,
      fn: async () => {
        return (await this.db.delete(users).where(eq(users.id, id)).returning())[0];
      }
    });
  }

  async isAdmin(userId: string) {
    const userRolesRelation = await this.db
      .select()
      .from(usersToRoles)
      .where(eq(usersToRoles.userId, userId))
      .rightJoin(roles, eq(roles.id, usersToRoles.roleId));

    return userRolesRelation.some((userRoleRelation) => {
      return userRoleRelation.roles.name === 'admin';
    });
  }

  isAdminSync(userWithRoles: UserWithRoles) {
    return userWithRoles.roles.some((role) => role.name === 'admin');
  }

  async hasPlus(userId: string) {
    const userRolesRelation = await this.db
      .select()
      .from(usersToRoles)
      .where(eq(usersToRoles.userId, userId))
      .rightJoin(roles, eq(roles.id, usersToRoles.roleId));

    return userRolesRelation.some((userRoleRelation) => {
      return userRoleRelation.roles.name === 'rc:plus';
    });
  }

  hasPlusSync(userWithRoles: UserWithRoles) {
    return userWithRoles.roles.some((role) => role.name === 'rc:plus');
  }

  isObjectOwner(object: { userId: string }, userId: string) {
    return object.userId === userId;
  }

  getUserMaxQueries(userWithRoles: UserWithRoles) {
    const queryPermissions: string[] = [];
    userWithRoles.roles.forEach((role) => {
      const queryPermission = role.permissions.find((permission) => {
        return permission.startsWith('query:');
      });
      if (queryPermission) queryPermissions.push(queryPermission);
    });
    const maxQueries = Math.max(5, ...queryPermissions.map((p) => parseInt(p.split(':')[1])));
    return maxQueries;
  }

  getUserMaxGeneratedImages(userWithRoles: UserWithRoles) {
    const imagePermissions: string[] = [];
    userWithRoles.roles.forEach((role) => {
      const queryPermission = role.permissions.find((permission) => {
        return permission.startsWith('image:');
      });
      if (queryPermission) imagePermissions.push(queryPermission);
    });
    const maxQueries = Math.max(1, ...imagePermissions.map((p) => parseInt(p.split(':')[1])));
    return maxQueries;
  }
}

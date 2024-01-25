import { roles, usersToRoles } from '@revelationsai/core/database/schema';
import type { CreateRoleData, Role, UpdateRoleData } from '@revelationsai/core/model/role';
import { SQL, and, desc, eq } from 'drizzle-orm';
import type { RAIDatabase } from '../lib/database/config';
import type { CacheKeysInputFn, CacheService } from './cache';
import type { UserService } from './user';

export class RoleService {
  static ROLES_CACHE_COLLECTION = 'roles';
  static defaultCacheKeysFn: CacheKeysInputFn<Role> = (role) => [
    { name: 'id', value: role.id },
    { name: 'name', value: role.name }
  ];

  private readonly cacheService: CacheService;
  private readonly db: RAIDatabase;
  private readonly userService: UserService;

  constructor(config: { db: RAIDatabase; cacheService: CacheService; userService: UserService }) {
    this.cacheService = config.cacheService;
    this.db = config.db;
    this.userService = config.userService;
  }

  async getRoles(
    options: {
      where?: SQL<unknown>;
      limit?: number;
      offset?: number;
      orderBy?: SQL<unknown>;
    } = {}
  ) {
    const { where, limit = 25, offset = 0, orderBy = desc(roles.createdAt) } = options;

    return await this.db
      .select()
      .from(roles)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy);
  }

  async getRole(id: string) {
    return await this.cacheService.cacheGet({
      collection: RoleService.ROLES_CACHE_COLLECTION,
      key: { name: 'id', value: id },
      fn: async () => (await this.db.select().from(roles).where(eq(roles.id, id))).at(0)
    });
  }

  async getRoleOrThrow(id: string) {
    const role = await this.getRole(id);
    if (!role) {
      throw new Error(`Role with id ${id} not found`);
    }
    return role;
  }

  async getRoleByName(name: string) {
    return await this.cacheService.cacheGet({
      collection: RoleService.ROLES_CACHE_COLLECTION,
      key: { name: 'name', value: name },
      fn: async () => (await this.db.select().from(roles).where(eq(roles.name, name))).at(0)
    });
  }

  async getRoleByNameOrThrow(name: string) {
    const role = await this.getRoleByName(name);
    if (!role) {
      throw new Error(`Role with name ${name} not found`);
    }
    return role;
  }

  async createRole(data: CreateRoleData) {
    return await this.cacheService.cacheUpsert({
      collection: RoleService.ROLES_CACHE_COLLECTION,
      keys: RoleService.defaultCacheKeysFn,
      fn: async () =>
        (
          await this.db
            .insert(roles)
            .values({
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning()
        )[0]
    });
  }

  async updateRole(id: string, data: UpdateRoleData) {
    return await this.cacheService.cacheUpsert({
      collection: RoleService.ROLES_CACHE_COLLECTION,
      keys: RoleService.defaultCacheKeysFn,
      fn: async () => {
        return (
          await this.db
            .update(roles)
            .set({
              ...data,
              createdAt: undefined,
              updatedAt: new Date()
            })
            .where(eq(roles.id, id))
            .returning()
        )[0];
      }
    });
  }

  async deleteRole(id: string) {
    return await this.cacheService.cacheDelete({
      collection: RoleService.ROLES_CACHE_COLLECTION,
      keys: RoleService.defaultCacheKeysFn,
      fn: async () => {
        return (await this.db.delete(roles).where(eq(roles.id, id)).returning())[0];
      }
    });
  }

  async getRolesByUserId(userId: string) {
    return await this.cacheService.cacheGet({
      collection: RoleService.ROLES_CACHE_COLLECTION,
      key: { name: 'userId', value: userId, type: 'set' },
      fn: async () => {
        const userRolesRelation = await this.db
          .select()
          .from(usersToRoles)
          .innerJoin(roles, eq(usersToRoles.roleId, roles.id))
          .where(eq(usersToRoles.userId, userId));

        return userRolesRelation.map((userRoleRelation) => userRoleRelation.roles);
      }
    });
  }

  async addRoleToUser(roleName: string, userId: string) {
    const role = await this.getRoleByNameOrThrow(roleName);
    const user = await this.userService.getUserOrThrow(userId);

    await this.cacheService.cacheUpsert({
      collection: RoleService.ROLES_CACHE_COLLECTION,
      keys: (userRoleRelation) => [{ name: 'userId', value: userRoleRelation.userId, type: 'set' }],
      fn: async () =>
        (
          await this.db
            .insert(usersToRoles)
            .values({
              userId: user.id,
              roleId: role.id
            })
            .returning()
        )[0]
    });

    return {
      user,
      role
    };
  }

  async removeRoleFromUser(roleName: string, userId: string) {
    const role = await this.getRoleByNameOrThrow(roleName);
    const user = await this.userService.getUserOrThrow(userId);

    await this.cacheService.cacheDelete({
      collection: RoleService.ROLES_CACHE_COLLECTION,
      keys: (userRoleRelation) => [{ name: 'userId', value: userRoleRelation.userId }],
      fn: async () =>
        (
          await this.db
            .delete(usersToRoles)
            .where(and(eq(usersToRoles.userId, user.id), eq(usersToRoles.roleId, role.id)))
            .returning()
        )[0]
    });
  }

  async doesUserHaveRole(roleName: string, userId: string) {
    const roles = await this.getRolesByUserId(userId);
    return roles.some((role) => role.name === roleName);
  }
}

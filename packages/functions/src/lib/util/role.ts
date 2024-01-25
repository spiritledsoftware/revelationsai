import { roles } from '@revelationsai/core/database/schema';
import { like } from 'drizzle-orm';
import db from '../database';
import { roleService } from '../services';

export async function getStripeRoles() {
  return await roleService.getRoles({
    where: like(roles.name, 'stripe:%')
  });
}

export async function deleteStripeRoles() {
  return await db.delete(roles).where(like(roles.name, 'stripe:%')).returning();
}

export async function getRcRoles() {
  return await roleService.getRoles({
    where: like(roles.name, 'rc:%')
  });
}

export async function deleteRcRoles() {
  return await db.delete(roles).where(like(roles.name, 'rc:%')).returning();
}

import { eq } from "drizzle-orm";

import type { ModuleDeps } from "../../../lib/types";
import * as s from "../db-schema";
import type { CreateUserInput, Permission, User } from "../types";

interface RoleData {
  createdAt: Date;
  description?: string;
  id: string;
  name: string;
  permissions: Permission[];
  updatedAt: Date;
}

export function createUserWorkflows(
  deps: ModuleDeps,
  getRolePermissions: (roleId: string) => Promise<Permission[]>,
) {
  const { db, pubsub } = deps;

  async function getUserRoles(userId: string): Promise<RoleData[]> {
    const rows = await db
      .select({
        createdAt: s.authRoles.createdAt,
        description: s.authRoles.description,
        id: s.authRoles.id,
        name: s.authRoles.name,
        updatedAt: s.authRoles.updatedAt,
      })
      .from(s.authRoles)
      .innerJoin(s.authUserRoles, eq(s.authUserRoles.roleId, s.authRoles.id))
      .where(eq(s.authUserRoles.userId, userId));

    const roles: RoleData[] = [];
    for (const row of rows) {
      const perms = await getRolePermissions(row.id);
      roles.push({
        createdAt: row.createdAt,
        description: row.description ?? undefined,
        id: row.id,
        name: row.name,
        permissions: perms,
        updatedAt: row.updatedAt,
      });
    }
    return roles;
  }

  async function createUser(data: CreateUserInput): Promise<User> {
    const passwordHash = await Bun.password.hash(data.password);
    const [row] = await db
      .insert(s.authUsers)
      .values({
        email: data.email,
        metadata: data.metadata ?? {},
        name: data.name ?? null,
        passwordHash,
      })
      .returning();

    const user: User = {
      createdAt: row!.createdAt,
      email: row!.email,
      id: row!.id,
      metadata: row!.metadata as Record<string, unknown>,
      name: row!.name ?? undefined,
      roles: [],
      updatedAt: row!.updatedAt,
    };

    await pubsub.publish("user:created", { user });
    return user;
  }

  async function getUserById(id: string): Promise<User | null> {
    const [row] = await db
      .select()
      .from(s.authUsers)
      .where(eq(s.authUsers.id, id))
      .limit(1);

    if (!row) return null;
    const roles = await getUserRoles(id);
    return {
      createdAt: row.createdAt,
      email: row.email,
      id: row.id,
      metadata: row.metadata as Record<string, unknown>,
      name: row.name ?? undefined,
      roles: roles as User["roles"],
      updatedAt: row.updatedAt,
    };
  }

  async function getUserByEmail(email: string): Promise<User | null> {
    const [row] = await db
      .select()
      .from(s.authUsers)
      .where(eq(s.authUsers.email, email))
      .limit(1);

    if (!row) return null;
    const roles = await getUserRoles(row.id);
    return {
      createdAt: row.createdAt,
      email: row.email,
      id: row.id,
      metadata: row.metadata as Record<string, unknown>,
      name: row.name ?? undefined,
      roles: roles as User["roles"],
      updatedAt: row.updatedAt,
    };
  }

  async function updateUser(
    id: string,
    data: Partial<Pick<User, "name" | "metadata">>,
  ): Promise<User> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const [row] = await db
      .update(s.authUsers)
      .set(updateData)
      .where(eq(s.authUsers.id, id))
      .returning();

    const roles = await getUserRoles(id);
    const user: User = {
      createdAt: row!.createdAt,
      email: row!.email,
      id: row!.id,
      metadata: row!.metadata as Record<string, unknown>,
      name: row!.name ?? undefined,
      roles: roles as User["roles"],
      updatedAt: row!.updatedAt,
    };

    await pubsub.publish("user:updated", { user });
    return user;
  }

  async function deleteUser(id: string): Promise<void> {
    await db.delete(s.authUsers).where(eq(s.authUsers.id, id));
    await pubsub.publish("user:deleted", { userId: id });
  }

  async function hasPermission(
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const { and } = await import("drizzle-orm");
    const rows = await db
      .select({ id: s.authPermissions.id })
      .from(s.authPermissions)
      .innerJoin(
        s.authRolePermissions,
        eq(s.authRolePermissions.permissionId, s.authPermissions.id),
      )
      .innerJoin(
        s.authUserRoles,
        eq(s.authUserRoles.roleId, s.authRolePermissions.roleId),
      )
      .where(
        and(
          eq(s.authUserRoles.userId, userId),
          eq(s.authPermissions.resource, resource),
          eq(s.authPermissions.action, action),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  async function getUserPermissions(userId: string): Promise<Permission[]> {
    const rows = await db
      .selectDistinct({
        action: s.authPermissions.action,
        description: s.authPermissions.description,
        id: s.authPermissions.id,
        resource: s.authPermissions.resource,
      })
      .from(s.authPermissions)
      .innerJoin(
        s.authRolePermissions,
        eq(s.authRolePermissions.permissionId, s.authPermissions.id),
      )
      .innerJoin(
        s.authUserRoles,
        eq(s.authUserRoles.roleId, s.authRolePermissions.roleId),
      )
      .where(eq(s.authUserRoles.userId, userId));

    return rows.map((row) => ({
      action: row.action,
      description: row.description ?? undefined,
      id: row.id,
      resource: row.resource,
    }));
  }

  return {
    createUser,
    deleteUser,
    getUserByEmail,
    getUserById,
    getUserPermissions,
    getUserRoles,
    hasPermission,
    updateUser,
  };
}

import { and, eq } from "drizzle-orm";

import type { UnitDeps } from "../../types";
import * as s from "../db-schema";
import type { Permission } from "../types";

interface RoleData {
  createdAt: Date;
  description?: string;
  id: string;
  name: string;
  permissions: Permission[];
  updatedAt: Date;
}

export function createRoleWorkflows(deps: UnitDeps) {
  const { db, pubsub } = deps;

  async function getRolePermissions(roleId: string): Promise<Permission[]> {
    const rows = await db
      .select({
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
      .where(eq(s.authRolePermissions.roleId, roleId));

    return rows.map((row) => ({
      action: row.action,
      description: row.description ?? undefined,
      id: row.id,
      resource: row.resource,
    }));
  }

  async function createRole(
    name: string,
    permissions: { resource: string; action: string }[],
    description?: string,
  ): Promise<RoleData> {
    const [existing] = await db
      .select({ id: s.authRoles.id })
      .from(s.authRoles)
      .where(eq(s.authRoles.name, name))
      .limit(1);

    if (existing) {
      const perms = await getRolePermissions(existing.id);
      return {
        createdAt: new Date(),
        description,
        id: existing.id,
        name,
        permissions: perms,
        updatedAt: new Date(),
      };
    }

    const [roleRow] = await db
      .insert(s.authRoles)
      .values({ description, name })
      .returning();

    if (!roleRow) throw new Error("Failed to insert role");

    const permIds: string[] = [];
    for (const perm of permissions) {
      const [permRow] = await db
        .insert(s.authPermissions)
        .values({ action: perm.action, resource: perm.resource })
        .onConflictDoUpdate({
          set: { resource: perm.resource },
          target: [s.authPermissions.resource, s.authPermissions.action],
        })
        .returning();
      if (!permRow) throw new Error("Failed to insert permission");
      permIds.push(permRow.id);
    }

    for (const permId of permIds) {
      await db
        .insert(s.authRolePermissions)
        .values({ permissionId: permId, roleId: roleRow.id })
        .onConflictDoNothing();
    }

    const role: RoleData = {
      createdAt: roleRow.createdAt,
      description,
      id: roleRow.id,
      name,
      permissions: permIds.map((id, i) => {
        const perm = permissions[i];
        if (!perm) throw new Error(`Permission at index ${i} not found`);
        return { action: perm.action, id, resource: perm.resource };
      }),
      updatedAt: roleRow.updatedAt,
    };

    await pubsub.publish("role:created", { role });
    return role;
  }

  async function deleteRole(name: string): Promise<void> {
    await db.delete(s.authRoles).where(eq(s.authRoles.name, name));
    await pubsub.publish("role:deleted", { roleName: name });
  }

  async function getAllRoles(): Promise<RoleData[]> {
    const rows = await db.select().from(s.authRoles).orderBy(s.authRoles.name);

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

  async function assignRole(userId: string, roleName: string): Promise<void> {
    const [role] = await db
      .select({ id: s.authRoles.id })
      .from(s.authRoles)
      .where(eq(s.authRoles.name, roleName))
      .limit(1);

    if (!role) throw new Error(`Role "${roleName}" not found`);

    await db
      .insert(s.authUserRoles)
      .values({ roleId: role.id, userId })
      .onConflictDoNothing();

    await pubsub.publish("role:assigned", { roleName, userId });
  }

  async function unassignRole(userId: string, roleName: string): Promise<void> {
    const [role] = await db
      .select({ id: s.authRoles.id })
      .from(s.authRoles)
      .where(eq(s.authRoles.name, roleName))
      .limit(1);

    if (!role) return;

    await db
      .delete(s.authUserRoles)
      .where(
        and(
          eq(s.authUserRoles.userId, userId),
          eq(s.authUserRoles.roleId, role.id),
        ),
      );

    await pubsub.publish("role:unassigned", { roleName, userId });
  }

  return {
    assignRole,
    createRole,
    deleteRole,
    getAllRoles,
    getRolePermissions,
    unassignRole,
  };
}

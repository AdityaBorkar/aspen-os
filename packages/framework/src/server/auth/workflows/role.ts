import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as s from "../db-schema";
import type { RoleData } from "../types";

interface RoleWorkflowsDeps {
  db: NodePgDatabase;
  pubsub: { publish<T = unknown>(topic: string, data: T): Promise<string> };
}

export function createRoleWorkflows(deps: RoleWorkflowsDeps) {
  const { db, pubsub } = deps;

  async function assignRole(userId: string, roleName: string): Promise<void> {
    const [row] = await db
      .update(s.user)
      .set({ role: roleName })
      .where(eq(s.user.id, userId))
      .returning();

    if (!row) throw new Error(`User "${userId}" not found`);
    await pubsub.publish("role:assigned", { roleName, userId });
  }

  async function unassignRole(userId: string): Promise<void> {
    await db.update(s.user).set({ role: null }).where(eq(s.user.id, userId));
    await pubsub.publish("role:unassigned", { userId });
  }

  async function deleteRole(name: string): Promise<void> {
    await db.update(s.user).set({ role: null }).where(eq(s.user.role, name));

    await pubsub.publish("role:deleted", { roleName: name });
  }

  async function getAllRoles(): Promise<RoleData[]> {
    const rows = await db
      .selectDistinct({ name: s.user.role })
      .from(s.user)
      .where(sql`${s.user.role} IS NOT NULL`);

    const roles: RoleData[] = [];
    for (const r of rows) {
      if (r.name === null) continue;
      roles.push({
        createdAt: new Date(),
        id: r.name,
        name: r.name,
        permissions: [],
        updatedAt: new Date(),
      });
    }
    return roles;
  }

  return {
    assignRole,
    deleteRole,
    getAllRoles,
    unassignRole,
  };
}

import { eq, sql } from "drizzle-orm";

import { user } from "../db-schema";
import type { AuthServiceDeps, RoleData } from "../types";

export function createRoleServices(deps: AuthServiceDeps) {
  async function assign({
    userId,
    roleName,
  }: {
    roleName: string;
    userId: string;
  }): Promise<void> {
    const { db, pubsub } = deps;
    const [row] = await db
      .update(user)
      .set({ role: roleName })
      .where(eq(user.id, userId))
      .returning();

    if (!row) throw new Error(`User "${userId}" not found`);
    await pubsub.publishControlPlane("role:assigned", { roleName, userId });
  }

  async function unassign({ userId }: { userId: string }): Promise<void> {
    const { db, pubsub } = deps;
    await db.update(user).set({ role: null }).where(eq(user.id, userId));
    await pubsub.publishControlPlane("role:unassigned", { userId });
  }

  async function remove({ name }: { name: string }): Promise<void> {
    const { db, pubsub } = deps;
    await db.update(user).set({ role: null }).where(eq(user.role, name));
    await pubsub.publishControlPlane("role:deleted", { roleName: name });
  }

  async function list(): Promise<RoleData[]> {
    const { db } = deps;
    const rows = await db
      .selectDistinct({ name: user.role })
      .from(user)
      .where(sql`${user.role} IS NOT NULL`);

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

  return { assign, list, remove, unassign };
}

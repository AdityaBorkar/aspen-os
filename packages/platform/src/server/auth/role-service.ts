import * as schema from "#/server/db/schema";

import { eq, sql } from "drizzle-orm";

import type { AuthServiceDeps, RoleData } from "./types";

export async function assignRole(
  { roleName, userId }: { roleName: string; userId: string },
  { db, pubsub }: AuthServiceDeps,
): Promise<void> {
  const [row] = await db
    .update(schema.user)
    .set({ role: roleName })
    .where(eq(schema.user.id, userId))
    .returning();

  if (!row) {
    throw new Error(`User "${userId}" not found`);
  }
  await pubsub?.publish("role:assigned", { roleName, userId });
}

export async function unassignRole(
  { userId }: { userId: string },
  { db, pubsub }: AuthServiceDeps,
): Promise<void> {
  await db.update(schema.user).set({ role: null }).where(eq(schema.user.id, userId));
  await pubsub?.publish("role:unassigned", { userId });
}

export async function deleteRole(
  { name }: { name: string },
  { db, pubsub }: AuthServiceDeps,
): Promise<void> {
  await db.update(schema.user).set({ role: null }).where(eq(schema.user.role, name));
  await pubsub?.publish("role:deleted", { roleName: name });
}

export async function listRoles({ db }: AuthServiceDeps): Promise<RoleData[]> {
  const rows = await db
    .selectDistinct({ name: schema.user.role })
    .from(schema.user)
    .where(sql`${schema.user.role} IS NOT NULL`);

  const roles: RoleData[] = [];
  for (const roleRow of rows) {
    if (roleRow.name === null) {
      continue;
    }
    roles.push({
      createdAt: new Date(),
      id: roleRow.name,
      name: roleRow.name,
      permissions: [],
      updatedAt: new Date(),
    });
  }
  return roles;
}

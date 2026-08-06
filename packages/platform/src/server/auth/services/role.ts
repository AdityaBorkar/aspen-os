import { eq, sql } from "drizzle-orm";

import * as s from "../db-schema";
import type { AuthServiceDeps, RoleData } from "../index";

export async function assignRole(
  { roleName, userId }: { roleName: string; userId: string },
  { db, pubsub }: AuthServiceDeps,
): Promise<void> {
  const [row] = await db
    .update(s.user)
    .set({ role: roleName })
    .where(eq(s.user.id, userId))
    .returning();

  if (!row) throw new Error(`User "${userId}" not found`);
  await pubsub?.publish("role:assigned", { roleName, userId });
}

export async function unassignRole(
  { userId }: { userId: string },
  { db, pubsub }: AuthServiceDeps,
): Promise<void> {
  await db.update(s.user).set({ role: null }).where(eq(s.user.id, userId));
  await pubsub?.publish("role:unassigned", { userId });
}

export async function deleteRole(
  { name }: { name: string },
  { db, pubsub }: AuthServiceDeps,
): Promise<void> {
  await db.update(s.user).set({ role: null }).where(eq(s.user.role, name));
  await pubsub?.publish("role:deleted", { roleName: name });
}

export async function listRoles({ db }: AuthServiceDeps): Promise<RoleData[]> {
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

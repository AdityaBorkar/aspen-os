import { eq, sql } from "drizzle-orm";

import { getContext } from "../../context";
import { user } from "../db-schema";
import type { RoleData } from "../types";

export async function assignRole({
  userId,
  roleName,
}: {
  roleName: string;
  userId: string;
}): Promise<void> {
  const { db, pubsub } = getContext();
  const [row] = await db
    .update(user)
    .set({ role: roleName })
    .where(eq(user.id, userId))
    .returning();

  if (!row) throw new Error(`User "${userId}" not found`);
  await pubsub.publish("role:assigned", { roleName, userId });
}

export async function unassignRole({
  userId,
}: {
  userId: string;
}): Promise<void> {
  const { db, pubsub } = getContext();
  await db.update(user).set({ role: null }).where(eq(user.id, userId));
  await pubsub.publish("role:unassigned", { userId });
}

export async function deleteRole({ name }: { name: string }): Promise<void> {
  const { db, pubsub } = getContext();
  await db.update(user).set({ role: null }).where(eq(user.role, name));
  await pubsub.publish("role:deleted", { roleName: name });
}

export async function getAllRoles(): Promise<RoleData[]> {
  const { db } = getContext();
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

import { eq, sql } from "drizzle-orm";

import { getContext } from "../../context";
import * as s from "../db-schema";
import type { RoleData } from "../types";

export async function assignRole(input: {
  roleName: string;
  userId: string;
}): Promise<void> {
  const { db, pubsub } = getContext();
  const [row] = await db
    .update(s.user)
    .set({ role: input.roleName })
    .where(eq(s.user.id, input.userId))
    .returning();

  if (!row) throw new Error(`User "${input.userId}" not found`);
  await pubsub.publish("role:assigned", {
    roleName: input.roleName,
    userId: input.userId,
  });
}

export async function unassignRole(input: { userId: string }): Promise<void> {
  const { db, pubsub } = getContext();
  await db
    .update(s.user)
    .set({ role: null })
    .where(eq(s.user.id, input.userId));
  await pubsub.publish("role:unassigned", { userId: input.userId });
}

export async function deleteRole(input: { name: string }): Promise<void> {
  const { db, pubsub } = getContext();
  await db
    .update(s.user)
    .set({ role: null })
    .where(eq(s.user.role, input.name));
  await pubsub.publish("role:deleted", { roleName: input.name });
}

export async function getAllRoles(): Promise<RoleData[]> {
  const { db } = getContext();
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

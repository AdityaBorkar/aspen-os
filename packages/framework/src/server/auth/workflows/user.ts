import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as s from "../db-schema";
import type { CreateUserInput, User } from "../types";

interface UserWorkflowsDeps {
  db: NodePgDatabase;
  pubsub: { publish<T = unknown>(topic: string, data: T): Promise<string> };
}

export function createUserWorkflows(deps: UserWorkflowsDeps) {
  const { db, pubsub } = deps;

  function toUser(row: typeof s.user.$inferSelect): User {
    return {
      banExpires: row.banExpires ?? undefined,
      banned: row.banned ?? false,
      banReason: row.banReason ?? undefined,
      createdAt: row.createdAt,
      displayUsername: row.displayUsername ?? undefined,
      email: row.email,
      emailVerified: row.emailVerified,
      id: row.id,
      image: row.image ?? undefined,
      name: row.name,
      phoneNumber: row.phoneNumber ?? undefined,
      phoneNumberVerified: row.phoneNumberVerified ?? undefined,
      role: row.role ?? undefined,
      updatedAt: row.updatedAt,
      username: row.username ?? undefined,
    };
  }

  async function createUser(data: CreateUserInput): Promise<User> {
    const passwordHash = await Bun.password.hash(data.password);

    const [row] = await db
      .insert(s.user)
      .values({
        email: data.email,
        emailVerified: false,
        id: crypto.randomUUID(),
        name: data.name ?? "",
      })
      .returning();

    if (!row) throw new Error("Failed to create user");

    await db.insert(s.account).values({
      accountId: row.id,
      id: crypto.randomUUID(),
      password: passwordHash,
      providerId: "credential",
      userId: row.id,
    });

    const user = toUser(row);
    await pubsub.publish("user:created", { user });
    return user;
  }

  async function getUserById(id: string): Promise<User | null> {
    const [row] = await db
      .select()
      .from(s.user)
      .where(eq(s.user.id, id))
      .limit(1);

    if (!row) return null;
    return toUser(row);
  }

  async function getUserByEmail(email: string): Promise<User | null> {
    const [row] = await db
      .select()
      .from(s.user)
      .where(eq(s.user.email, email))
      .limit(1);

    if (!row) return null;
    return toUser(row);
  }

  async function updateUser(
    id: string,
    data: Partial<Pick<User, "name" | "image" | "role">>,
  ): Promise<User> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.role !== undefined) updateData.role = data.role;

    const [row] = await db
      .update(s.user)
      .set(updateData)
      .where(eq(s.user.id, id))
      .returning();

    if (!row) throw new Error(`User "${id}" not found`);

    const user = toUser(row);
    await pubsub.publish("user:updated", { user });
    return user;
  }

  async function deleteUser(id: string): Promise<void> {
    await db.delete(s.user).where(eq(s.user.id, id));
    await pubsub.publish("user:deleted", { userId: id });
  }

  return {
    createUser,
    deleteUser,
    getUserByEmail,
    getUserById,
    updateUser,
  };
}

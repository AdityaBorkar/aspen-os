import { eq } from "drizzle-orm";

import { password } from "../../bun-compat";
import { getContext } from "../../context";
import * as s from "../db-schema";
import type { User } from "../types";

interface CreateUserInput {
  email: string;
  name?: string;
  password: string;
}

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

export async function createUser(input: CreateUserInput): Promise<User> {
  const { db, pubsub } = getContext();
  const passwordHash = await password.hash(input.password);

  const [row] = await db
    .insert(s.user)
    .values({
      email: input.email,
      emailVerified: false,
      id: crypto.randomUUID(),
      name: input.name ?? "",
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

export async function getUserById(input: { id: string }): Promise<User | null> {
  const { db } = getContext();
  const [row] = await db
    .select()
    .from(s.user)
    .where(eq(s.user.id, input.id))
    .limit(1);

  if (!row) return null;
  return toUser(row);
}

export async function getUserByEmail(input: {
  email: string;
}): Promise<User | null> {
  const { db } = getContext();
  const [row] = await db
    .select()
    .from(s.user)
    .where(eq(s.user.email, input.email))
    .limit(1);

  if (!row) return null;
  return toUser(row);
}

export async function updateUser(input: {
  id: string;
  data: Partial<Pick<User, "name" | "image" | "role">>;
}): Promise<User> {
  const { db, pubsub } = getContext();
  const updateData: Record<string, unknown> = {};
  if (input.data.name !== undefined) updateData.name = input.data.name;
  if (input.data.image !== undefined) updateData.image = input.data.image;
  if (input.data.role !== undefined) updateData.role = input.data.role;

  const [row] = await db
    .update(s.user)
    .set(updateData)
    .where(eq(s.user.id, input.id))
    .returning();

  if (!row) throw new Error(`User "${input.id}" not found`);

  const user = toUser(row);
  await pubsub.publish("user:updated", { user });
  return user;
}

export async function deleteUser(input: { id: string }): Promise<void> {
  const { db, pubsub } = getContext();
  await db.delete(s.user).where(eq(s.user.id, input.id));
  await pubsub.publish("user:deleted", { userId: input.id });
}

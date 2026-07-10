import { eq } from "drizzle-orm";

import { password as Password } from "../../bun-compat";
import { getContext } from "../../context";
import { account, user } from "../db-schema";
import type { User } from "../types";

function toUser(row: typeof user.$inferSelect): User {
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

export async function createUser({
  email,
  name,
  password,
}: {
  email: string;
  name?: string;
  password: string;
}): Promise<User> {
  const { db, pubsub } = getContext();
  const passwordHash = await Password.hash(password);

  const [row] = await db
    .insert(user)
    .values({
      email,
      emailVerified: false,
      id: crypto.randomUUID(),
      name: name ?? "",
    })
    .returning();

  if (!row) throw new Error("Failed to create user");

  await db.insert(account).values({
    accountId: row.id,
    id: crypto.randomUUID(),
    password: passwordHash,
    providerId: "credential",
    userId: row.id,
  });

  const $user = toUser(row);
  await pubsub.publish("user:created", { user: $user });
  return $user;
}

export async function getUserById({
  id,
}: {
  id: string;
}): Promise<User | null> {
  const { db } = getContext();
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1);

  if (!row) return null;
  return toUser(row);
}

export async function getUserByEmail(input: {
  email: string;
}): Promise<User | null> {
  const { db } = getContext();
  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);

  if (!row) return null;
  return toUser(row);
}

export async function updateUser({
  id,
  data,
}: {
  id: string;
  data: Partial<Pick<User, "name" | "image" | "role">>;
}): Promise<User> {
  const { db, pubsub } = getContext();
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.image !== undefined) updateData.image = data.image;
  if (data.role !== undefined) updateData.role = data.role;

  const [row] = await db
    .update(user)
    .set(updateData)
    .where(eq(user.id, id))
    .returning();

  if (!row) throw new Error(`User "${id}" not found`);

  const $user = toUser(row);
  await pubsub.publish("user:updated", { user: $user });
  return $user;
}

export async function deleteUser({ id }: { id: string }): Promise<void> {
  const { db, pubsub } = getContext();
  await db.delete(user).where(eq(user.id, id));
  await pubsub.publish("user:deleted", { userId: id });
}

import { account, user } from "#/server/db/schema";
import { password as Password } from "#/server/utils";

import { eq } from "drizzle-orm";

import type { AuthServiceDeps, User } from "./types";
import { toUser } from "./utils";

function toUserFromRow(row: typeof user.$inferSelect): User {
  return toUser({
    banExpires: row.ban_expires,
    banReason: row.ban_reason,
    banned: row.banned,
    createdAt: row.created_at,
    displayUsername: row.display_username,
    email: row.email,
    emailVerified: row.email_verified,
    id: row.id,
    image: row.image,
    name: row.name,
    phoneNumber: row.phone_number,
    phoneNumberVerified: row.phone_number_verified,
    role: row.role,
    twoFactorEnabled: row.two_factor_enabled,
    updatedAt: row.updated_at,
    username: row.username,
  });
}

export async function createUser(
  { email, name, password }: { email: string; name?: string; password: string },
  { db, pubsub }: AuthServiceDeps,
): Promise<User> {
  const passwordHash = await Password.hash(password);

  const [row] = await db
    .insert(user)
    .values({
      email,
      email_verified: false,
      id: crypto.randomUUID(),
      name: name ?? "",
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create user");
  }

  await db.insert(account).values({
    account_id: row.id,
    id: crypto.randomUUID(),
    password: passwordHash,
    provider_id: "credential",
    user_id: row.id,
  });

  const $user = toUserFromRow(row);
  await pubsub?.publish("user:created", { user: $user });
  return $user;
}

export async function getUserById(
  { id }: { id: string },
  { db }: AuthServiceDeps,
): Promise<User | null> {
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (!row) {
    return null;
  }
  return toUserFromRow(row);
}

export async function getUserByEmail(
  input: { email: string },
  { db }: AuthServiceDeps,
): Promise<User | null> {
  const [row] = await db.select().from(user).where(eq(user.email, input.email)).limit(1);
  if (!row) {
    return null;
  }
  return toUserFromRow(row);
}

export async function updateUser(
  {
    id,
    data,
  }: {
    id: string;
    data: Partial<Pick<User, "image" | "name" | "role">>;
  },
  { db, pubsub }: AuthServiceDeps,
): Promise<User> {
  const updateData: Partial<Pick<User, "image" | "name" | "role">> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.image !== undefined) {
    updateData.image = data.image;
  }
  if (data.role !== undefined) {
    updateData.role = data.role;
  }

  const [row] = await db.update(user).set(updateData).where(eq(user.id, id)).returning();

  if (!row) {
    throw new Error(`User "${id}" not found`);
  }

  const $user = toUserFromRow(row);
  await pubsub?.publish("user:updated", { user: $user });
  return $user;
}

export async function deleteUser(
  { id }: { id: string },
  { db, pubsub }: AuthServiceDeps,
): Promise<void> {
  await db.delete(user).where(eq(user.id, id));
  await pubsub?.publish("user:deleted", { userId: id });
}

export async function getUser(
  query: { id: string } | { email: string },
  deps: AuthServiceDeps,
): Promise<User | null> {
  if ("id" in query) {
    return getUserById({ id: query.id }, deps);
  }
  return getUserByEmail({ email: query.email }, deps);
}

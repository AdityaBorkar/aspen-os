import { account, user } from "#/server/db/schema";

import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

import type { AuthServiceDeps, User } from "./types";
import { toUser } from "./utils";

function toUserFromRow(row: typeof user.$inferSelect): User {
  return toUser({
    banExpires: row.banExpires,
    banReason: row.banReason,
    banned: row.banned,
    createdAt: row.createdAt,
    displayUsername: row.displayUsername,
    email: row.email,
    emailVerified: row.emailVerified,
    id: row.id,
    image: row.image,
    name: row.name,
    phoneNumber: row.phoneNumber,
    phoneNumberVerified: row.phoneNumberVerified,
    role: row.role,
    twoFactorEnabled: row.twoFactorEnabled,
    updatedAt: row.updatedAt,
    username: row.username,
  });
}

export async function createUser(
  { email, name, password }: { email: string; name?: string; password: string },
  { db, pubsub }: AuthServiceDeps,
): Promise<User> {
  // Better Auth looks up credentials by lowercased email at sign-in and
  // verifies `account.password` with its own scrypt hasher
  // (`better-auth/crypto`). A custom hash format here can never verify and
  // surfaces as "Invalid password", so hash with the same function and
  // normalize the email exactly like Better Auth sign-up does.
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const [row] = await db
    .insert(user)
    .values({
      email: normalizedEmail,
      emailVerified: false,
      id: crypto.randomUUID(),
      name: name ?? "",
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create user");
  }

  await db.insert(account).values({
    accountId: row.id,
    id: crypto.randomUUID(),
    password: passwordHash,
    providerId: "credential",
    userId: row.id,
  });

  const $user = toUserFromRow(row);
  await pubsub?.publish("user.created", { user: $user });
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
  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.email, input.email.trim().toLowerCase()))
    .limit(1);
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
  await pubsub?.publish("user.updated", { user: $user });
  return $user;
}

export async function deleteUser(
  { id }: { id: string },
  { db, pubsub }: AuthServiceDeps,
): Promise<void> {
  await db.delete(user).where(eq(user.id, id));
  await pubsub?.publish("user.deleted", { userId: id });
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

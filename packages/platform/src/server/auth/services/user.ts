import { eq } from "drizzle-orm";

import { password as Password } from "../../utils/bun-compat";
import { account, user } from "../db-schema";
import type { AuthServiceDeps, User } from "../index";
import { toUser } from "../utils/mappers";

export async function createUser(
  { email, name, password }: { email: string; name?: string; password: string },
  { db, pubsub }: AuthServiceDeps,
): Promise<User> {
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

  const $user = toUser(row);
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
  return toUser(row);
}

export async function getUserByEmail(
  input: { email: string },
  { db }: AuthServiceDeps,
): Promise<User | null> {
  const [row] = await db.select().from(user).where(eq(user.email, input.email)).limit(1);
  if (!row) {
    return null;
  }
  return toUser(row);
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
  const updateData: Record<string, unknown> = {};
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

  const $user = toUser(row);
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

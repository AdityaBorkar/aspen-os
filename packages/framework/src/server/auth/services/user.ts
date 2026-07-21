import { eq } from "drizzle-orm";

import { password as Password } from "../../bun-compat";
import { account, user } from "../db-schema";
import type { AuthServiceDeps, User } from "../types";

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

export function createUserServices(deps: AuthServiceDeps) {
  async function create({
    email,
    name,
    password,
  }: {
    email: string;
    name?: string;
    password: string;
  }): Promise<User> {
    const { db, pubsub } = deps;
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
    await pubsub.publishControlPlane("user:created", { user: $user });
    return $user;
  }

  async function getById({ id }: { id: string }): Promise<User | null> {
    const { db } = deps;
    const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!row) return null;
    return toUser(row);
  }

  async function getByEmail(input: { email: string }): Promise<User | null> {
    const { db } = deps;
    const [row] = await db
      .select()
      .from(user)
      .where(eq(user.email, input.email))
      .limit(1);
    if (!row) return null;
    return toUser(row);
  }

  async function update({
    id,
    data,
  }: {
    id: string;
    data: Partial<Pick<User, "image" | "name" | "role">>;
  }): Promise<User> {
    const { db, pubsub } = deps;
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
    await pubsub.publishControlPlane("user:updated", { user: $user });
    return $user;
  }

  async function remove({ id }: { id: string }): Promise<void> {
    const { db, pubsub } = deps;
    await db.delete(user).where(eq(user.id, id));
    await pubsub.publishControlPlane("user:deleted", { userId: id });
  }

  return {
    create,
    delete: remove,
    get(query: { id: string } | { email: string }) {
      if ("id" in query) return getById({ id: query.id });
      return getByEmail({ email: query.email });
    },
    update,
  };
}

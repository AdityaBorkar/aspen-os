import { eq } from "drizzle-orm";
import { getContext } from "../../../lib/context";
import * as s from "../db-schema";
import type { CreateUserInput, User } from "../types";
import { getUserRoles } from "./role";

export async function createUser(data: CreateUserInput): Promise<User> {
	const { db, pubsub } = getContext();
	const passwordHash = await Bun.password.hash(data.password);
	const [row] = await db
		.insert(s.authUsers)
		.values({
			email: data.email,
			passwordHash,
			name: data.name ?? null,
			metadata: data.metadata ?? {},
		})
		.returning();

	const user: User = {
		id: row!.id,
		email: row!.email,
		name: row!.name ?? undefined,
		roles: [],
		metadata: row!.metadata as Record<string, unknown>,
		createdAt: row!.createdAt,
		updatedAt: row!.updatedAt,
	};

	await pubsub.publish("user:created", { user });
	return user;
}

export async function getUserById(id: string): Promise<User | null> {
	const { db } = getContext();
	const [row] = await db
		.select()
		.from(s.authUsers)
		.where(eq(s.authUsers.id, id))
		.limit(1);

	if (!row) return null;
	const roles = await getUserRoles(id);
	return {
		id: row.id,
		email: row.email,
		name: row.name ?? undefined,
		roles,
		metadata: row.metadata as Record<string, unknown>,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export async function getUserByEmail(email: string): Promise<User | null> {
	const { db } = getContext();
	const [row] = await db
		.select()
		.from(s.authUsers)
		.where(eq(s.authUsers.email, email))
		.limit(1);

	if (!row) return null;
	const roles = await getUserRoles(row.id);
	return {
		id: row.id,
		email: row.email,
		name: row.name ?? undefined,
		roles,
		metadata: row.metadata as Record<string, unknown>,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export async function updateUser(
	id: string,
	data: Partial<Pick<User, "name" | "metadata">>,
): Promise<User> {
	const { db, pubsub } = getContext();
	const updateData: Record<string, unknown> = { updatedAt: new Date() };
	if (data.name !== undefined) updateData.name = data.name;
	if (data.metadata !== undefined) updateData.metadata = data.metadata;

	const [row] = await db
		.update(s.authUsers)
		.set(updateData)
		.where(eq(s.authUsers.id, id))
		.returning();

	const roles = await getUserRoles(id);
	const user: User = {
		id: row!.id,
		email: row!.email,
		name: row!.name ?? undefined,
		roles,
		metadata: row!.metadata as Record<string, unknown>,
		createdAt: row!.createdAt,
		updatedAt: row!.updatedAt,
	};

	await pubsub.publish("user:updated", { user });
	return user;
}

export async function deleteUser(id: string): Promise<void> {
	const { db, pubsub } = getContext();
	await db.delete(s.authUsers).where(eq(s.authUsers.id, id));
	await pubsub.publish("user:deleted", { userId: id });
}

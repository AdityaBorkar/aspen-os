import { and, eq } from "drizzle-orm";
import { getContext } from "../../../lib/context";
import * as s from "../db-schema";
import type { Permission, Role } from "../types";

export async function getRolePermissions(
	roleId: string,
): Promise<Permission[]> {
	const { db } = getContext();
	const rows = await db
		.select({
			id: s.authPermissions.id,
			resource: s.authPermissions.resource,
			action: s.authPermissions.action,
			description: s.authPermissions.description,
		})
		.from(s.authPermissions)
		.innerJoin(
			s.authRolePermissions,
			eq(s.authRolePermissions.permissionId, s.authPermissions.id),
		)
		.where(eq(s.authRolePermissions.roleId, roleId));

	return rows.map((row) => ({
		id: row.id,
		resource: row.resource,
		action: row.action,
		description: row.description ?? undefined,
	}));
}

export async function hasPermission(
	userId: string,
	resource: string,
	action: string,
): Promise<boolean> {
	const { db } = getContext();
	const rows = await db
		.select({ id: s.authPermissions.id })
		.from(s.authPermissions)
		.innerJoin(
			s.authRolePermissions,
			eq(s.authRolePermissions.permissionId, s.authPermissions.id),
		)
		.innerJoin(
			s.authUserRoles,
			eq(s.authUserRoles.roleId, s.authRolePermissions.roleId),
		)
		.where(
			and(
				eq(s.authUserRoles.userId, userId),
				eq(s.authPermissions.resource, resource),
				eq(s.authPermissions.action, action),
			),
		)
		.limit(1);

	return rows.length > 0;
}

export async function getUserPermissions(
	userId: string,
): Promise<Permission[]> {
	const { db } = getContext();
	const rows = await db
		.selectDistinct({
			id: s.authPermissions.id,
			resource: s.authPermissions.resource,
			action: s.authPermissions.action,
			description: s.authPermissions.description,
		})
		.from(s.authPermissions)
		.innerJoin(
			s.authRolePermissions,
			eq(s.authRolePermissions.permissionId, s.authPermissions.id),
		)
		.innerJoin(
			s.authUserRoles,
			eq(s.authUserRoles.roleId, s.authRolePermissions.roleId),
		)
		.where(eq(s.authUserRoles.userId, userId));

	return rows.map((row) => ({
		id: row.id,
		resource: row.resource,
		action: row.action,
		description: row.description ?? undefined,
	}));
}

export async function getUserRoles(userId: string): Promise<Role[]> {
	const { db } = getContext();
	const rows = await db
		.select({
			id: s.authRoles.id,
			name: s.authRoles.name,
			description: s.authRoles.description,
			createdAt: s.authRoles.createdAt,
			updatedAt: s.authRoles.updatedAt,
		})
		.from(s.authRoles)
		.innerJoin(s.authUserRoles, eq(s.authUserRoles.roleId, s.authRoles.id))
		.where(eq(s.authUserRoles.userId, userId));

	const roles: Role[] = [];
	for (const row of rows) {
		const perms = await getRolePermissions(row.id);
		roles.push({
			id: row.id,
			name: row.name,
			description: row.description ?? undefined,
			permissions: perms,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}
	return roles;
}

export async function assignRole(
	userId: string,
	roleName: string,
): Promise<void> {
	const { db, pubsub } = getContext();
	const [role] = await db
		.select({ id: s.authRoles.id })
		.from(s.authRoles)
		.where(eq(s.authRoles.name, roleName))
		.limit(1);

	if (!role) throw new Error(`Role "${roleName}" not found`);

	await db
		.insert(s.authUserRoles)
		.values({ userId, roleId: role.id })
		.onConflictDoNothing();

	await pubsub.publish("role:assigned", { userId, roleName });
}

export async function unassignRole(
	userId: string,
	roleName: string,
): Promise<void> {
	const { db, pubsub } = getContext();
	const [role] = await db
		.select({ id: s.authRoles.id })
		.from(s.authRoles)
		.where(eq(s.authRoles.name, roleName))
		.limit(1);

	if (!role) return;

	await db
		.delete(s.authUserRoles)
		.where(
			and(
				eq(s.authUserRoles.userId, userId),
				eq(s.authUserRoles.roleId, role.id),
			),
		);

	await pubsub.publish("role:unassigned", { userId, roleName });
}

export async function createRole(
	name: string,
	permissions: { resource: string; action: string }[],
	description?: string,
): Promise<Role> {
	const { db, pubsub } = getContext();
	const [existing] = await db
		.select({ id: s.authRoles.id })
		.from(s.authRoles)
		.where(eq(s.authRoles.name, name))
		.limit(1);

	if (existing) {
		const perms = await getRolePermissions(existing.id);
		return {
			id: existing.id,
			name,
			description,
			permissions: perms,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
	}

	const [roleRow] = await db
		.insert(s.authRoles)
		.values({ name, description })
		.returning();

	const permIds: string[] = [];
	for (const perm of permissions) {
		const [permRow] = await db
			.insert(s.authPermissions)
			.values({ resource: perm.resource, action: perm.action })
			.onConflictDoUpdate({
				target: [s.authPermissions.resource, s.authPermissions.action],
				set: { resource: perm.resource },
			})
			.returning();
		permIds.push(permRow!.id);
	}

	for (const permId of permIds) {
		await db
			.insert(s.authRolePermissions)
			.values({ roleId: roleRow!.id, permissionId: permId })
			.onConflictDoNothing();
	}

	const role: Role = {
		id: roleRow!.id,
		name,
		description,
		permissions: permIds.map((id, i) => ({
			id,
			resource: permissions[i]!.resource,
			action: permissions[i]!.action,
		})),
		createdAt: roleRow!.createdAt,
		updatedAt: roleRow!.updatedAt,
	};

	await pubsub.publish("role:created", { role });
	return role;
}

export async function deleteRole(name: string): Promise<void> {
	const { db, pubsub } = getContext();
	await db.delete(s.authRoles).where(eq(s.authRoles.name, name));
	await pubsub.publish("role:deleted", { roleName: name });
}

export async function getAllRoles(): Promise<Role[]> {
	const { db } = getContext();
	const rows = await db.select().from(s.authRoles).orderBy(s.authRoles.name);

	const roles: Role[] = [];
	for (const row of rows) {
		const perms = await getRolePermissions(row.id);
		roles.push({
			id: row.id,
			name: row.name,
			description: row.description ?? undefined,
			permissions: perms,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}
	return roles;
}

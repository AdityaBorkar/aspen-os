import {
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const authRoles = pgTable("auth_roles", {
	id: text("id").primaryKey().default("gen_random_uuid()::text"),
	name: text("name").unique().notNull(),
	description: text("description"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const authPermissions = pgTable(
	"auth_permissions",
	{
		id: text("id").primaryKey().default("gen_random_uuid()::text"),
		resource: text("resource").notNull(),
		action: text("action").notNull(),
		description: text("description"),
	},
	(table) => ({
		resourceActionUnique: uniqueIndex(
			"auth_permissions_resource_action_unique",
		).on(table.resource, table.action),
	}),
);

export const authRolePermissions = pgTable(
	"auth_role_permissions",
	{
		roleId: text("role_id")
			.notNull()
			.references(() => authRoles.id, { onDelete: "cascade" }),
		permissionId: text("permission_id")
			.notNull()
			.references(() => authPermissions.id, { onDelete: "cascade" }),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
	}),
);

export const authUsers = pgTable("auth_users", {
	id: text("id").primaryKey().default("gen_random_uuid()::text"),
	email: text("email").unique().notNull(),
	passwordHash: text("password_hash").notNull(),
	name: text("name"),
	metadata: jsonb("metadata").default({}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const authUserRoles = pgTable(
	"auth_user_roles",
	{
		userId: text("user_id")
			.notNull()
			.references(() => authUsers.id, { onDelete: "cascade" }),
		roleId: text("role_id")
			.notNull()
			.references(() => authRoles.id, { onDelete: "cascade" }),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.userId, table.roleId] }),
	}),
);

export const authSessions = pgTable("auth_sessions", {
	id: text("id").primaryKey().default("gen_random_uuid()::text"),
	userId: text("user_id")
		.notNull()
		.references(() => authUsers.id, { onDelete: "cascade" }),
	token: text("token").unique().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

import {
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const authRoles = pgTable("auth_roles", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  description: text("description"),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  name: text("name").unique().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authPermissions = pgTable(
  "auth_permissions",
  {
    action: text("action").notNull(),
    description: text("description"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    resource: text("resource").notNull(),
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
    permissionId: text("permission_id")
      .notNull()
      .references(() => authPermissions.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => authRoles.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  }),
);

export const authUsers = pgTable("auth_users", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  email: text("email").unique().notNull(),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  metadata: jsonb("metadata").default({}),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authUserRoles = pgTable(
  "auth_user_roles",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => authRoles.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  }),
);

export const authSessions = pgTable("auth_sessions", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  id: text("id").primaryKey().default("gen_random_uuid()::text"),
  token: text("token").unique().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
});

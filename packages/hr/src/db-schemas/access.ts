import { accessLevelEnum, permissionActionEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const hrUser = pgTable(
  "hr_user",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    employeeId: text("employee_id").notNull(),
    id: uuidv7("id").primaryKey(),
    isActive: boolean("is_active").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_hr_user_employee_id").on(table.employeeId),
    index("idx_hr_user_user_id").on(table.userId),
  ],
);

export const hrRole = pgTable("hr_role", {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  description: text("description"),
  id: uuidv7("id").primaryKey(),
  isActive: boolean("is_active").notNull().default(true),
  isSystem: boolean("is_system").notNull().default(false),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hrPermission = pgTable("hr_permission", {
  action: permissionActionEnum("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  description: text("description"),
  id: uuidv7("id").primaryKey(),
  module: text("module").notNull(),
});

export const hrRolePermission = pgTable(
  "hr_role_permission",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuidv7("id").primaryKey(),
    permissionId: text("permission_id").notNull(),
    roleId: text("role_id").notNull(),
  },
  (table) => [
    index("idx_hr_role_permission_role_id").on(table.roleId),
    index("idx_hr_role_permission_permission_id").on(table.permissionId),
  ],
);

export const hrUserRole = pgTable(
  "hr_user_role",
  {
    branchId: text("branch_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    hrUserId: text("hr_user_id").notNull(),
    id: uuidv7("id").primaryKey(),
    roleId: text("role_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_hr_user_role_hr_user_id").on(table.hrUserId),
    index("idx_hr_user_role_role_id").on(table.roleId),
    index("idx_hr_user_role_branch_id").on(table.branchId),
  ],
);

export const hrUserBranchAccess = pgTable(
  "hr_user_branch_access",
  {
    accessLevel: accessLevelEnum("access_level").notNull().default("read_only"),
    branchId: text("branch_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    hrUserId: text("hr_user_id").notNull(),
    id: uuidv7("id").primaryKey(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_hr_user_branch_access_hr_user_id").on(table.hrUserId),
    index("idx_hr_user_branch_access_branch_id").on(table.branchId),
  ],
);

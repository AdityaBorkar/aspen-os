import { accessLevelEnum, permissionActionEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const hrUser = pgTable(
  "hr_user",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    user_id: text().notNull(),
  },
  (table) => [
    index("idx_hr_user_employee_id").on(table.employee_id),
    index("idx_hr_user_user_id").on(table.user_id),
  ],
);

export const hrRole = pgTable("hr_role", {
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  description: text(),
  id: uuidv7().primaryKey(),
  is_active: boolean().notNull().default(true),
  is_system: boolean().notNull().default(false),
  name: text().notNull(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const hrPermission = pgTable("hr_permission", {
  action: permissionActionEnum().notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  description: text(),
  id: uuidv7().primaryKey(),
  module: text().notNull(),
});

export const hrRolePermission = pgTable(
  "hr_role_permission",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    permission_id: text().notNull(),
    role_id: text().notNull(),
  },
  (table) => [
    index("idx_hr_role_permission_role_id").on(table.role_id),
    index("idx_hr_role_permission_permission_id").on(table.permission_id),
  ],
);

export const hrUserRole = pgTable(
  "hr_user_role",
  {
    branch_id: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    hr_user_id: text().notNull(),
    id: uuidv7().primaryKey(),
    role_id: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_hr_user_role_hr_user_id").on(table.hr_user_id),
    index("idx_hr_user_role_role_id").on(table.role_id),
    index("idx_hr_user_role_branch_id").on(table.branch_id),
  ],
);

export const hrUserBranchAccess = pgTable(
  "hr_user_branch_access",
  {
    access_level: accessLevelEnum().notNull().default("read_only"),
    branch_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    hr_user_id: text().notNull(),
    id: uuidv7().primaryKey(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_hr_user_branch_access_hr_user_id").on(table.hr_user_id),
    index("idx_hr_user_branch_access_branch_id").on(table.branch_id),
  ],
);

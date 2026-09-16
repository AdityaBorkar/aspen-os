// Deprecated tables (HEALTHCARE-SPEC D7): roster, attendance, leave, and
// role management moved to hr-core / hr-attendance / hr-leave. Rows stay
// pushed for history until the later drop; no healthcare workflow writes
// them anymore. healthcare_explorer_grant is owned by operations and stays.
import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const healthcareStaff = pgTable(
  "healthcare_staff",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    doj: date(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    phone: text(),
    role: text().notNull(),
    status: text().notNull().default("active"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_staff_branch_id").on(table.branch_id),
    index("idx_healthcare_staff_role").on(table.role),
    index("idx_healthcare_staff_status").on(table.status),
  ],
);

export const healthcareStaffRole = pgTable(
  "healthcare_staff_role",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    permissions: jsonb().$type<string[]>().notNull().default([]),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_healthcare_staff_role_branch_name").on(table.branch_id, table.name),
    index("idx_healthcare_staff_role_branch_id").on(table.branch_id),
  ],
);

export const healthcareRosterEntry = pgTable(
  "healthcare_roster_entry",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    date: date().notNull(),
    id: uuidv7().primaryKey(),
    month: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    shift: text().notNull(),
    staff_id: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_roster_entry_branch_id").on(table.branch_id),
    index("idx_healthcare_roster_entry_month").on(table.month),
    index("idx_healthcare_roster_entry_staff_id").on(table.staff_id),
  ],
);

export const healthcareAttendance = pgTable(
  "healthcare_attendance",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    date: date().notNull(),
    id: uuidv7().primaryKey(),
    marked_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    staff_id: text().notNull(),
    status: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_attendance_branch_id").on(table.branch_id),
    index("idx_healthcare_attendance_date").on(table.date),
    index("idx_healthcare_attendance_staff_id").on(table.staff_id),
  ],
);

export const healthcareLeaveRequest = pgTable(
  "healthcare_leave_request",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    decided_at: timestamp({ withTimezone: true }),
    decided_by: text(),
    from_date: date().notNull(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    reason: text().notNull(),
    requested_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    staff_id: text().notNull(),
    status: text().notNull().default("applied"),
    to_date: date().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_leave_request_branch_id").on(table.branch_id),
    index("idx_healthcare_leave_request_staff_id").on(table.staff_id),
    index("idx_healthcare_leave_request_status").on(table.status),
  ],
);

export const healthcareExplorerGrant = pgTable(
  "healthcare_explorer_grant",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp({ withTimezone: true }),
    grantee_id: text().notNull(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    scope: text().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_explorer_grant_branch_id").on(table.branch_id),
    index("idx_healthcare_explorer_grant_grantee_id").on(table.grantee_id),
  ],
);

export type HealthcareStaff = typeof healthcareStaff.$inferSelect;
export type NewHealthcareStaff = typeof healthcareStaff.$inferInsert;
export type HealthcareStaffRole = typeof healthcareStaffRole.$inferSelect;
export type NewHealthcareStaffRole = typeof healthcareStaffRole.$inferInsert;
export type HealthcareRosterEntry = typeof healthcareRosterEntry.$inferSelect;
export type NewHealthcareRosterEntry = typeof healthcareRosterEntry.$inferInsert;
export type HealthcareAttendance = typeof healthcareAttendance.$inferSelect;
export type NewHealthcareAttendance = typeof healthcareAttendance.$inferInsert;
export type HealthcareLeaveRequest = typeof healthcareLeaveRequest.$inferSelect;
export type NewHealthcareLeaveRequest = typeof healthcareLeaveRequest.$inferInsert;
export type HealthcareExplorerGrant = typeof healthcareExplorerGrant.$inferSelect;
export type NewHealthcareExplorerGrant = typeof healthcareExplorerGrant.$inferInsert;

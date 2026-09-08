import {
  attendanceRequestStatusEnum,
  attendanceStatusEnum,
  compensatoryLeaveStatusEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const attendance = pgTable(
  "attendance",
  {
    attendance_request: text(),
    check_in_time: timestamp({ withTimezone: true }),
    check_out_time: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    date: date().notNull(),
    early_exit: boolean().notNull().default(false),
    early_exit_minutes: integer().notNull().default(0),
    employee_id: text().notNull(),
    half_day_type: text(),
    id: uuidv7().primaryKey(),
    is_half_day: boolean().notNull().default(false),
    late_entry: boolean().notNull().default(false),
    late_entry_minutes: integer().notNull().default(0),
    metadata: jsonb(),
    notes: text(),
    shift: text(),
    status: attendanceStatusEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    working_hours: text(),
  },
  (table) => [
    index("idx_attendance_employee_id").on(table.employee_id),
    index("idx_attendance_date").on(table.date),
  ],
);

export const attendanceRequest = pgTable(
  "attendance_request",
  {
    approved_at: timestamp({ withTimezone: true }),
    approved_by: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    from_date: date().notNull(),
    id: uuidv7().primaryKey(),
    reason: text().notNull(),
    rejected_at: timestamp({ withTimezone: true }),
    rejected_by: text(),
    rejection_reason: text(),
    status: attendanceRequestStatusEnum().notNull().default("pending"),
    to_date: date().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_attendance_request_employee_id").on(table.employee_id),
    index("idx_attendance_request_status").on(table.status),
  ],
);

export const compensatoryLeaveRequest = pgTable(
  "compensatory_leave_request",
  {
    approved_at: timestamp({ withTimezone: true }),
    approved_by: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    id: uuidv7().primaryKey(),
    leave_allocation: text(),
    leave_type: text().notNull(),
    number_of_days: numeric().notNull().default("1"),
    reason: text().notNull(),
    rejected_at: timestamp({ withTimezone: true }),
    rejected_by: text(),
    rejection_reason: text(),
    status: compensatoryLeaveStatusEnum().notNull().default("pending"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    work_date: date().notNull(),
  },
  (table) => [
    index("idx_compensatory_leave_request_employee_id").on(table.employee_id),
    index("idx_compensatory_leave_request_status").on(table.status),
  ],
);

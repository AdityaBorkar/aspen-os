import { shiftAssignmentStatusEnum, shiftRequestStatusEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, date, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const shiftType = pgTable(
  "shift_type",
  {
    allow_check_out_after_end: integer().notNull().default(0),
    allow_overtime: boolean().notNull().default(false),
    begin_check_in_before_start: integer().notNull().default(0),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    determine_check_in_by: text(),
    early_exit_grace_minutes: integer().notNull().default(0),
    enable_auto_attendance: boolean().notNull().default(false),
    enable_auto_update_sync: boolean().notNull().default(false),
    end_time: text().notNull(),
    holiday_list: text(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    late_entry_grace_minutes: integer().notNull().default(0),
    mark_attendance_on_holidays: boolean().notNull().default(false),
    name: text().notNull(),
    overtime_type: text(),
    process_attendance_after: text(),
    start_time: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    working_hours_calculation: text(),
    working_hours_threshold_for_absent: text(),
    working_hours_threshold_for_half_day: text(),
  },
  (table) => [index("idx_shift_type_is_active").on(table.is_active)],
);

export const shiftLocation = pgTable("shift_location", {
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  id: uuidv7().primaryKey(),
  is_active: boolean().notNull().default(true),
  latitude: text().notNull(),
  longitude: text().notNull(),
  name: text().notNull(),
  radius: integer().notNull().default(500),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const shiftAssignment = pgTable(
  "shift_assignment",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    end_date: date(),
    id: uuidv7().primaryKey(),
    notes: text(),
    shift_location: text(),
    shift_type: text().notNull(),
    start_date: date().notNull(),
    status: shiftAssignmentStatusEnum().notNull().default("active"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_shift_assignment_employee_id").on(table.employee_id),
    index("idx_shift_assignment_shift_type").on(table.shift_type),
    index("idx_shift_assignment_status").on(table.status),
  ],
);

export const shiftRequest = pgTable(
  "shift_request",
  {
    approved_at: timestamp({ withTimezone: true }),
    approved_by: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    from_date: date().notNull(),
    id: uuidv7().primaryKey(),
    reason: text(),
    rejected_at: timestamp({ withTimezone: true }),
    rejected_by: text(),
    rejection_reason: text(),
    shift_assignment: text(),
    shift_type: text().notNull(),
    status: shiftRequestStatusEnum().notNull().default("pending"),
    to_date: date(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_shift_request_employee_id").on(table.employee_id),
    index("idx_shift_request_status").on(table.status),
  ],
);

export const shiftSchedule = pgTable("shift_schedule", {
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  friday: boolean().notNull().default(false),
  id: uuidv7().primaryKey(),
  is_active: boolean().notNull().default(true),
  monday: boolean().notNull().default(false),
  name: text().notNull(),
  saturday: boolean().notNull().default(false),
  shift_type: text().notNull(),
  sunday: boolean().notNull().default(false),
  thursday: boolean().notNull().default(false),
  tuesday: boolean().notNull().default(false),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  wednesday: boolean().notNull().default(false),
});

export const shiftScheduleAssignment = pgTable(
  "shift_schedule_assignment",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    end_date: date(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    shift_schedule: text().notNull(),
    start_date: date().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_shift_schedule_assignment_employee_id").on(table.employee_id)],
);

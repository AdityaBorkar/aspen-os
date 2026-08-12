import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { shiftAssignmentStatusEnum, shiftRequestStatusEnum } from "./enums";

export const shiftType = pgTable(
  "shift_type",
  {
    allowCheckOutAfterEnd: integer("allow_check_out_after_end")
      .notNull()
      .default(0),
    allowOvertime: boolean("allow_overtime").notNull().default(false),
    beginCheckInBeforeStart: integer("begin_check_in_before_start")
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    determineCheckInBy: text("determine_check_in_by"),
    earlyExitGraceMinutes: integer("early_exit_grace_minutes")
      .notNull()
      .default(0),
    enableAutoAttendance: boolean("enable_auto_attendance")
      .notNull()
      .default(false),
    enableAutoUpdateSync: boolean("enable_auto_update_sync")
      .notNull()
      .default(false),
    endTime: text("end_time").notNull(),
    holidayList: text("holiday_list"),
    id: text("id").primaryKey().default(sql`uuidv7()`),
    isActive: boolean("is_active").notNull().default(true),
    lateEntryGraceMinutes: integer("late_entry_grace_minutes")
      .notNull()
      .default(0),
    markAttendanceOnHolidays: boolean("mark_attendance_on_holidays")
      .notNull()
      .default(false),
    name: text("name").notNull(),
    overtimeType: text("overtime_type"),
    processAttendanceAfter: text("process_attendance_after"),
    startTime: text("start_time").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    workingHoursCalculation: text("working_hours_calculation"),
    workingHoursThresholdForAbsent: text("working_hours_threshold_for_absent"),
    workingHoursThresholdForHalfDay: text(
      "working_hours_threshold_for_half_day",
    ),
  },
  (table) => [index("idx_shift_type_is_active").on(table.isActive)],
);

export const shiftLocation = pgTable("shift_location", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: text("id").primaryKey().default(sql`uuidv7()`),
  isActive: boolean("is_active").notNull().default(true),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  name: text("name").notNull(),
  radius: integer("radius").notNull().default(500),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const shiftAssignment = pgTable(
  "shift_assignment",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    endDate: date("end_date"),
    id: text("id").primaryKey().default(sql`uuidv7()`),
    notes: text("notes"),
    shiftLocation: text("shift_location"),
    shiftType: text("shift_type").notNull(),
    startDate: date("start_date").notNull(),
    status: shiftAssignmentStatusEnum("status").notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_shift_assignment_employee_id").on(table.employeeId),
    index("idx_shift_assignment_shift_type").on(table.shiftType),
    index("idx_shift_assignment_status").on(table.status),
  ],
);

export const shiftRequest = pgTable(
  "shift_request",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    fromDate: date("from_date").notNull(),
    id: text("id").primaryKey().default(sql`uuidv7()`),
    reason: text("reason"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    shiftAssignment: text("shift_assignment"),
    shiftType: text("shift_type").notNull(),
    status: shiftRequestStatusEnum("status").notNull().default("pending"),
    toDate: date("to_date"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_shift_request_employee_id").on(table.employeeId),
    index("idx_shift_request_status").on(table.status),
  ],
);

export const shiftSchedule = pgTable("shift_schedule", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  friday: boolean("friday").notNull().default(false),
  id: text("id").primaryKey().default(sql`uuidv7()`),
  isActive: boolean("is_active").notNull().default(true),
  monday: boolean("monday").notNull().default(false),
  name: text("name").notNull(),
  saturday: boolean("saturday").notNull().default(false),
  shiftType: text("shift_type").notNull(),
  sunday: boolean("sunday").notNull().default(false),
  thursday: boolean("thursday").notNull().default(false),
  tuesday: boolean("tuesday").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  wednesday: boolean("wednesday").notNull().default(false),
});

export const shiftScheduleAssignment = pgTable(
  "shift_schedule_assignment",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    endDate: date("end_date"),
    id: text("id").primaryKey().default(sql`uuidv7()`),
    isActive: boolean("is_active").notNull().default(true),
    shiftSchedule: text("shift_schedule").notNull(),
    startDate: date("start_date").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_shift_schedule_assignment_employee_id").on(table.employeeId),
  ],
);

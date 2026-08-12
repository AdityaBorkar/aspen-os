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

import {
  attendanceRequestStatusEnum,
  attendanceStatusEnum,
  compensatoryLeaveStatusEnum,
} from "./enums";

export const attendance = pgTable(
  "attendance",
  {
    attendanceRequest: text("attendance_request"),
    checkInTime: timestamp("check_in_time", { withTimezone: true }),
    checkOutTime: timestamp("check_out_time", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    date: date("date").notNull(),
    earlyExit: boolean("early_exit").notNull().default(false),
    earlyExitMinutes: integer("early_exit_minutes").notNull().default(0),
    employeeId: text("employee_id").notNull(),
    halfDayType: text("half_day_type"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isHalfDay: boolean("is_half_day").notNull().default(false),
    lateEntry: boolean("late_entry").notNull().default(false),
    lateEntryMinutes: integer("late_entry_minutes").notNull().default(0),
    metadata: jsonb("metadata"),
    notes: text("notes"),
    shift: text("shift"),
    status: attendanceStatusEnum("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    workingHours: text("working_hours"),
  },
  (table) => [
    index("idx_attendance_employee_id").on(table.employeeId),
    index("idx_attendance_date").on(table.date),
  ],
);

export const attendanceRequest = pgTable(
  "attendance_request",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    fromDate: date("from_date").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    reason: text("reason").notNull(),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    status: attendanceRequestStatusEnum("status").notNull().default("pending"),
    toDate: date("to_date").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_attendance_request_employee_id").on(table.employeeId),
    index("idx_attendance_request_status").on(table.status),
  ],
);

export const compensatoryLeaveRequest = pgTable(
  "compensatory_leave_request",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    leaveAllocation: text("leave_allocation"),
    leaveType: text("leave_type").notNull(),
    numberOfDays: numeric("number_of_days").notNull().default("1"),
    reason: text("reason").notNull(),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    status: compensatoryLeaveStatusEnum("status").notNull().default("pending"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    workDate: date("work_date").notNull(),
  },
  (table) => [
    index("idx_compensatory_leave_request_employee_id").on(table.employeeId),
    index("idx_compensatory_leave_request_status").on(table.status),
  ],
);

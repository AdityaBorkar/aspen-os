import { overtimeStatusEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const overtimeType = pgTable(
  "overtime_type",
  {
    amountCalculation: text("amount_calculation").notNull().default("fixed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    description: text("description"),
    fixedHourlyRate: numeric("fixed_hourly_rate"),
    holidayMultiplier: numeric("holiday_multiplier").notNull().default("2"),
    id: uuidv7("id").primaryKey(),
    isActive: boolean("is_active").notNull().default(true),
    maxOvertimeHoursPerDay: numeric("max_overtime_hours_per_day"),
    name: text("name").notNull(),
    overtimeSalaryComponent: text("overtime_salary_component"),
    standardMultiplier: numeric("standard_multiplier").notNull().default("1.5"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    weekendMultiplier: numeric("weekend_multiplier").notNull().default("2"),
  },
  (table) => [index("idx_overtime_type_is_active").on(table.isActive)],
);

export const overtimeSlip = pgTable(
  "overtime_slip",
  {
    amount: numeric("amount"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    employeeId: text("employee_id").notNull(),
    fromDate: date("from_date").notNull(),
    holidayHours: numeric("holiday_hours").notNull().default("0"),
    id: uuidv7("id").primaryKey(),
    metadata: jsonb("metadata"),
    notes: text("notes"),
    overtimeType: text("overtime_type").notNull(),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    standardHours: numeric("standard_hours").notNull().default("0"),
    status: overtimeStatusEnum("status").notNull().default("pending"),
    toDate: date("to_date").notNull(),
    totalOvertimeHours: numeric("total_overtime_hours").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    weekendHours: numeric("weekend_hours").notNull().default("0"),
  },
  (table) => [
    index("idx_overtime_slip_employee_id").on(table.employeeId),
    index("idx_overtime_slip_status").on(table.status),
  ],
);

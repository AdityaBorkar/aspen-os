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
    amount_calculation: text().notNull().default("fixed"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    description: text(),
    fixed_hourly_rate: numeric(),
    holiday_multiplier: numeric().notNull().default("2"),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    max_overtime_hours_per_day: numeric(),
    name: text().notNull(),
    overtime_salary_component: text(),
    standard_multiplier: numeric().notNull().default("1.5"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    weekend_multiplier: numeric().notNull().default("2"),
  },
  (table) => [index("idx_overtime_type_is_active").on(table.is_active)],
);

export const overtimeSlip = pgTable(
  "overtime_slip",
  {
    amount: numeric(),
    approved_at: timestamp({ withTimezone: true }),
    approved_by: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    from_date: date().notNull(),
    holiday_hours: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    metadata: jsonb(),
    notes: text(),
    overtime_type: text().notNull(),
    rejected_at: timestamp({ withTimezone: true }),
    rejected_by: text(),
    rejection_reason: text(),
    standard_hours: numeric().notNull().default("0"),
    status: overtimeStatusEnum().notNull().default("pending"),
    to_date: date().notNull(),
    total_overtime_hours: numeric().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    weekend_hours: numeric().notNull().default("0"),
  },
  (table) => [
    index("idx_overtime_slip_employee_id").on(table.employee_id),
    index("idx_overtime_slip_status").on(table.status),
  ],
);

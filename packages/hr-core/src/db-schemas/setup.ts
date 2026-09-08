import { holidayTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const hrSettings = pgTable("hr_settings", {
  allow_multiple_shift_assignments: boolean(),
  auto_attendance: boolean(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  default_holiday_list: text(),
  employee_naming_series: text(),
  expense_claim_default: text(),
  geolocation_tracking: boolean(),
  id: uuidv7().primaryKey(),
  leave_approval_workflow: text(),
  leave_without_pay_handling: text(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const payrollSettings = pgTable("payroll_settings", {
  benefits_application_mandatory: boolean(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  fiscal_year_end: text(),
  fiscal_year_start: text(),
  id: uuidv7().primaryKey(),
  income_tax_component: text(),
  multi_currency_expense_claims: boolean(),
  payroll_period_end: text(),
  payroll_period_start: text(),
  rounding: text(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const employmentType = pgTable(
  "employment_type",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    description: text(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    name: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_employment_type_is_active").on(table.is_active)],
);

export const department = pgTable(
  "department",
  {
    code: text().notNull(),
    cost_center: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    headcount: integer(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    manager: text(),
    metadata: jsonb(),
    name: text().notNull(),
    parent_department: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_department_is_active").on(table.is_active),
    index("idx_department_parent_department").on(table.parent_department),
  ],
);

export const designation = pgTable("designation", {
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  description: text(),
  id: uuidv7().primaryKey(),
  is_active: boolean().notNull().default(true),
  name: text().notNull(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const employeeGrade = pgTable("employee_grade", {
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  default_salary_structure: text(),
  description: text(),
  id: uuidv7().primaryKey(),
  is_active: boolean().notNull().default(true),
  name: text().notNull(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const holidayList = pgTable("holiday_list", {
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  description: text(),
  id: uuidv7().primaryKey(),
  is_active: boolean().notNull().default(true),
  name: text().notNull(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  weekly_off_days: jsonb(),
  year: integer().notNull(),
});

export const holiday = pgTable(
  "holiday",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    date: date().notNull(),
    description: text(),
    holiday_list_id: text().notNull(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    type: holidayTypeEnum().notNull().default("public"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_holiday_holiday_list_id").on(table.holiday_list_id)],
);

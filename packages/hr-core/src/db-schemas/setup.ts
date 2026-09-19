import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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

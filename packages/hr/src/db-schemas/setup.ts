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
  allowMultipleShiftAssignments: boolean("allow_multiple_shift_assignments"),
  autoAttendance: boolean("auto_attendance"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  defaultHolidayList: text("default_holiday_list"),
  employeeNamingSeries: text("employee_naming_series"),
  expenseClaimDefault: text("expense_claim_default"),
  geolocationTracking: boolean("geolocation_tracking"),
  id: uuidv7("id").primaryKey(),
  leaveApprovalWorkflow: text("leave_approval_workflow"),
  leaveWithoutPayHandling: text("leave_without_pay_handling"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payrollSettings = pgTable("payroll_settings", {
  benefitsApplicationMandatory: boolean("benefits_application_mandatory"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  fiscalYearEnd: text("fiscal_year_end"),
  fiscalYearStart: text("fiscal_year_start"),
  id: uuidv7("id").primaryKey(),
  incomeTaxComponent: text("income_tax_component"),
  multiCurrencyExpenseClaims: boolean("multi_currency_expense_claims"),
  payrollPeriodEnd: text("payroll_period_end"),
  payrollPeriodStart: text("payroll_period_start"),
  rounding: text("rounding"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employmentType = pgTable(
  "employment_type",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    description: text("description"),
    id: uuidv7("id").primaryKey(),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_employment_type_is_active").on(table.isActive)],
);

export const department = pgTable(
  "department",
  {
    code: text("code").notNull(),
    costCenter: text("cost_center"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    headcount: integer("headcount"),
    id: uuidv7("id").primaryKey(),
    isActive: boolean("is_active").notNull().default(true),
    manager: text("manager"),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    parentDepartment: text("parent_department"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_department_is_active").on(table.isActive),
    index("idx_department_parent_department").on(table.parentDepartment),
  ],
);

export const designation = pgTable("designation", {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  description: text("description"),
  id: uuidv7("id").primaryKey(),
  isActive: boolean("is_active").notNull().default(true),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeGrade = pgTable("employee_grade", {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  defaultSalaryStructure: text("default_salary_structure"),
  description: text("description"),
  id: uuidv7("id").primaryKey(),
  isActive: boolean("is_active").notNull().default(true),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const holidayList = pgTable("holiday_list", {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  description: text("description"),
  id: uuidv7("id").primaryKey(),
  isActive: boolean("is_active").notNull().default(true),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  weeklyOffDays: jsonb("weekly_off_days"),
  year: integer("year").notNull(),
});

export const holiday = pgTable(
  "holiday",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    date: date("date").notNull(),
    description: text("description"),
    holidayListId: text("holiday_list_id").notNull(),
    id: uuidv7("id").primaryKey(),
    name: text("name").notNull(),
    type: holidayTypeEnum("type").notNull().default("public"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_holiday_holiday_list_id").on(table.holidayListId)],
);

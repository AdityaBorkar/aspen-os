import {
  exitInterviewStatusEnum,
  fullAndFinalStatusEnum,
  lifecycleTaskStatusEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const onboardingTask = pgTable(
  "onboarding_task",
  {
    assigned_to: text(),
    completed_at: timestamp({ withTimezone: true }),
    completed_by: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    department: text(),
    description: text(),
    due_date: date(),
    id: uuidv7().primaryKey(),
    notes: text(),
    onboarding_id: text().notNull(),
    status: lifecycleTaskStatusEnum().notNull().default("pending"),
    title: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_onboarding_task_onboarding_id").on(table.onboarding_id)],
);

export const separationTask = pgTable(
  "separation_task",
  {
    assigned_to: text(),
    completed_at: timestamp({ withTimezone: true }),
    completed_by: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    department: text(),
    description: text(),
    due_date: date(),
    id: uuidv7().primaryKey(),
    notes: text(),
    separation_id: text().notNull(),
    status: lifecycleTaskStatusEnum().notNull().default("pending"),
    title: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_separation_task_separation_id").on(table.separation_id)],
);

export const exitInterview = pgTable(
  "exit_interview",
  {
    completed_date: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    feedback: text(),
    id: uuidv7().primaryKey(),
    interviewer: text(),
    questionnaire_template: text(),
    responses: jsonb(),
    scheduled_date: timestamp({ withTimezone: true }),
    separation_id: text(),
    status: exitInterviewStatusEnum().notNull().default("scheduled"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_exit_interview_employee_id").on(table.employee_id),
    index("idx_exit_interview_status").on(table.status),
  ],
);

export const fullAndFinalStatement = pgTable(
  "full_and_final_statement",
  {
    approved_at: timestamp({ withTimezone: true }),
    approved_by: text(),
    bonus: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    deductions: numeric().notNull().default("0"),
    employee_id: text().notNull(),
    gratuity: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    leave_encashment: numeric().notNull().default("0"),
    loan_recovery: numeric().notNull().default("0"),
    metadata: jsonb(),
    net_payable: numeric(),
    notes: text(),
    paid_at: timestamp({ withTimezone: true }),
    payment_entry: text(),
    pending_salary: numeric().notNull().default("0"),
    separation_id: text(),
    status: fullAndFinalStatusEnum().notNull().default("draft"),
    total_deductions: numeric(),
    total_earnings: numeric(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_full_and_final_statement_employee_id").on(table.employee_id),
    index("idx_full_and_final_statement_status").on(table.status),
  ],
);

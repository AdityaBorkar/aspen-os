import { uuidv7 } from "@aspen-os/platform/server";
import {
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import {
  exitInterviewStatusEnum,
  fullAndFinalStatusEnum,
  lifecycleTaskStatusEnum,
} from "./enums";

export const onboardingTask = pgTable(
  "onboarding_task",
  {
    assignedTo: text("assigned_to"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    department: text("department"),
    description: text("description"),
    dueDate: date("due_date"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    notes: text("notes"),
    onboardingId: text("onboarding_id").notNull(),
    status: lifecycleTaskStatusEnum("status").notNull().default("pending"),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_onboarding_task_onboarding_id").on(table.onboardingId),
  ],
);

export const separationTask = pgTable(
  "separation_task",
  {
    assignedTo: text("assigned_to"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    department: text("department"),
    description: text("description"),
    dueDate: date("due_date"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    notes: text("notes"),
    separationId: text("separation_id").notNull(),
    status: lifecycleTaskStatusEnum("status").notNull().default("pending"),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_separation_task_separation_id").on(table.separationId),
  ],
);

export const exitInterview = pgTable(
  "exit_interview",
  {
    completedDate: timestamp("completed_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull(),
    feedback: text("feedback"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    interviewer: text("interviewer"),
    questionnaireTemplate: text("questionnaire_template"),
    responses: jsonb("responses"),
    scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
    separationId: text("separation_id"),
    status: exitInterviewStatusEnum("status").notNull().default("scheduled"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_exit_interview_employee_id").on(table.employeeId),
    index("idx_exit_interview_status").on(table.status),
  ],
);

export const fullAndFinalStatement = pgTable(
  "full_and_final_statement",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    bonus: numeric("bonus").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deductions: numeric("deductions").notNull().default("0"),
    employeeId: text("employee_id").notNull(),
    gratuity: numeric("gratuity").notNull().default("0"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    leaveEncashment: numeric("leave_encashment").notNull().default("0"),
    loanRecovery: numeric("loan_recovery").notNull().default("0"),
    metadata: jsonb("metadata"),
    netPayable: numeric("net_payable"),
    notes: text("notes"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentEntry: text("payment_entry"),
    pendingSalary: numeric("pending_salary").notNull().default("0"),
    separationId: text("separation_id"),
    status: fullAndFinalStatusEnum("status").notNull().default("draft"),
    totalDeductions: numeric("total_deductions"),
    totalEarnings: numeric("total_earnings"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_full_and_final_statement_employee_id").on(table.employeeId),
    index("idx_full_and_final_statement_status").on(table.status),
  ],
);

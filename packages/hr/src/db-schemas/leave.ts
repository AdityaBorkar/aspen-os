import {
  earnedLeaveFrequencyEnum,
  leaveAllocationStatusEnum,
  leaveApplicationStatusEnum,
  leaveBlockListScopeEnum,
  leaveEncashmentStatusEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const leaveType = pgTable(
  "leave_type",
  {
    allow_negative_balance: boolean().notNull().default(false),
    applicable_after_working_days: integer().notNull().default(0),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    earned_leave_frequency: earnedLeaveFrequencyEnum(),
    id: uuidv7().primaryKey(),
    include_holidays_within_leaves: boolean().notNull().default(false),
    is_active: boolean().notNull().default(true),
    is_carry_forward: boolean().notNull().default(false),
    is_earned_leave: boolean().notNull().default(false),
    is_leave_without_pay: boolean().notNull().default(false),
    is_partially_paid: boolean().notNull().default(false),
    max_carry_forward_days: integer(),
    max_continuous_days_allowed: integer(),
    max_days_allowed: integer().notNull(),
    name: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_leave_type_is_active").on(table.is_active)],
);

export const leavePeriod = pgTable(
  "leave_period",
  {
    company: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    end_date: date().notNull(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    name: text().notNull(),
    start_date: date().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_leave_period_is_active").on(table.is_active)],
);

export const leavePolicy = pgTable("leave_policy", {
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  description: text(),
  id: uuidv7().primaryKey(),
  is_active: boolean().notNull().default(true),
  name: text().notNull(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const leavePolicyDetail = pgTable(
  "leave_policy_detail",
  {
    carry_forward_days: integer().notNull().default(0),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    leave_policy_id: text().notNull(),
    leave_type: text().notNull(),
    max_days: integer().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_leave_policy_detail_leave_policy_id").on(table.leave_policy_id)],
);

export const leavePolicyAssignment = pgTable(
  "leave_policy_assignment",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    effective_from: date().notNull(),
    effective_to: date(),
    employee_id: text().notNull(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    leave_period: text().notNull(),
    leave_policy: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_leave_policy_assignment_employee_id").on(table.employee_id),
    index("idx_leave_policy_assignment_leave_policy").on(table.leave_policy),
    index("idx_leave_policy_assignment_leave_period").on(table.leave_period),
  ],
);

export const leaveAllocation = pgTable(
  "leave_allocation",
  {
    carry_forwarded_days: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    earned_days: numeric().notNull().default("0"),
    employee_id: text().notNull(),
    id: uuidv7().primaryKey(),
    leave_period: text().notNull(),
    leave_policy_assignment: text(),
    leave_type: text().notNull(),
    status: leaveAllocationStatusEnum().notNull().default("active"),
    total_days: numeric().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    used_days: numeric().notNull().default("0"),
  },
  (table) => [
    index("idx_leave_allocation_employee_id").on(table.employee_id),
    index("idx_leave_allocation_leave_type").on(table.leave_type),
    index("idx_leave_allocation_status").on(table.status),
  ],
);

export const leaveApplication = pgTable(
  "leave_application",
  {
    approved_at: timestamp({ withTimezone: true }),
    approved_by: text(),
    cancelled_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    from_date: date().notNull(),
    half_day_date: date(),
    id: uuidv7().primaryKey(),
    is_half_day: boolean().notNull().default(false),
    leave_allocation: text(),
    leave_type: text().notNull(),
    reason: text(),
    rejected_at: timestamp({ withTimezone: true }),
    rejected_by: text(),
    rejection_reason: text(),
    status: leaveApplicationStatusEnum().notNull().default("draft"),
    to_date: date().notNull(),
    total_days: numeric().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_leave_application_employee_id").on(table.employee_id),
    index("idx_leave_application_status").on(table.status),
  ],
);

export const leaveEncashment = pgTable(
  "leave_encashment",
  {
    amount: numeric(),
    approved_at: timestamp({ withTimezone: true }),
    approved_by: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text().notNull(),
    encashable_days: numeric().notNull(),
    encashed_days: numeric().notNull(),
    id: uuidv7().primaryKey(),
    leave_period: text().notNull(),
    leave_type: text().notNull(),
    rejected_at: timestamp({ withTimezone: true }),
    rejected_by: text(),
    rejection_reason: text(),
    status: leaveEncashmentStatusEnum().notNull().default("pending"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_leave_encashment_employee_id").on(table.employee_id),
    index("idx_leave_encashment_status").on(table.status),
  ],
);

export const leaveBlockList = pgTable(
  "leave_block_list",
  {
    company: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    department: text(),
    from_date: date().notNull(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    name: text().notNull(),
    reason: text(),
    scope: leaveBlockListScopeEnum().notNull(),
    to_date: date().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_leave_block_list_is_active").on(table.is_active)],
);

export const leaveAdjustment = pgTable(
  "leave_adjustment",
  {
    adjusted_by: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    days: numeric().notNull(),
    employee_id: text().notNull(),
    id: uuidv7().primaryKey(),
    leave_ledger_entry: text().notNull(),
    leave_period: text(),
    leave_type: text().notNull(),
    reason: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_leave_adjustment_employee_id").on(table.employee_id)],
);

export const leaveLedgerEntry = pgTable(
  "leave_ledger_entry",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    days: numeric().notNull(),
    description: text().notNull(),
    employee_id: text().notNull(),
    id: uuidv7().primaryKey(),
    leave_application: text(),
    leave_type: text().notNull(),
    transaction_type: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_leave_ledger_entry_employee_id").on(table.employee_id),
    index("idx_leave_ledger_entry_leave_type").on(table.leave_type),
  ],
);

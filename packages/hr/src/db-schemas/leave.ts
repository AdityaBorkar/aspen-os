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
    allowNegativeBalance: boolean("allow_negative_balance").notNull().default(false),
    applicableAfterWorkingDays: integer("applicable_after_working_days").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    earnedLeaveFrequency: earnedLeaveFrequencyEnum("earned_leave_frequency"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    includeHolidaysWithinLeaves: boolean("include_holidays_within_leaves").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    isCarryForward: boolean("is_carry_forward").notNull().default(false),
    isEarnedLeave: boolean("is_earned_leave").notNull().default(false),
    isLeaveWithoutPay: boolean("is_leave_without_pay").notNull().default(false),
    isPartiallyPaid: boolean("is_partially_paid").notNull().default(false),
    maxCarryForwardDays: integer("max_carry_forward_days"),
    maxContinuousDaysAllowed: integer("max_continuous_days_allowed"),
    maxDaysAllowed: integer("max_days_allowed").notNull(),
    name: text("name").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_leave_type_is_active").on(table.isActive)],
);

export const leavePeriod = pgTable(
  "leave_period",
  {
    company: text("company"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    endDate: date("end_date").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_leave_period_is_active").on(table.isActive)],
);

export const leavePolicy = pgTable("leave_policy", {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  description: text("description"),
  id: text("id").primaryKey().$defaultFn(uuidv7),
  isActive: boolean("is_active").notNull().default(true),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leavePolicyDetail = pgTable(
  "leave_policy_detail",
  {
    carryForwardDays: integer("carry_forward_days").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    leavePolicyId: text("leave_policy_id").notNull(),
    leaveType: text("leave_type").notNull(),
    maxDays: integer("max_days").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_leave_policy_detail_leave_policy_id").on(table.leavePolicyId)],
);

export const leavePolicyAssignment = pgTable(
  "leave_policy_assignment",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isActive: boolean("is_active").notNull().default(true),
    leavePeriod: text("leave_period").notNull(),
    leavePolicy: text("leave_policy").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_leave_policy_assignment_employee_id").on(table.employeeId),
    index("idx_leave_policy_assignment_leave_policy").on(table.leavePolicy),
    index("idx_leave_policy_assignment_leave_period").on(table.leavePeriod),
  ],
);

export const leaveAllocation = pgTable(
  "leave_allocation",
  {
    carryForwardedDays: numeric("carry_forwarded_days").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    earnedDays: numeric("earned_days").notNull().default("0"),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    leavePeriod: text("leave_period").notNull(),
    leavePolicyAssignment: text("leave_policy_assignment"),
    leaveType: text("leave_type").notNull(),
    status: leaveAllocationStatusEnum("status").notNull().default("active"),
    totalDays: numeric("total_days").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    usedDays: numeric("used_days").notNull().default("0"),
  },
  (table) => [
    index("idx_leave_allocation_employee_id").on(table.employeeId),
    index("idx_leave_allocation_leave_type").on(table.leaveType),
    index("idx_leave_allocation_status").on(table.status),
  ],
);

export const leaveApplication = pgTable(
  "leave_application",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    employeeId: text("employee_id").notNull(),
    fromDate: date("from_date").notNull(),
    halfDayDate: date("half_day_date"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isHalfDay: boolean("is_half_day").notNull().default(false),
    leaveAllocation: text("leave_allocation"),
    leaveType: text("leave_type").notNull(),
    reason: text("reason"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    status: leaveApplicationStatusEnum("status").notNull().default("draft"),
    toDate: date("to_date").notNull(),
    totalDays: numeric("total_days").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_leave_application_employee_id").on(table.employeeId),
    index("idx_leave_application_status").on(table.status),
  ],
);

export const leaveEncashment = pgTable(
  "leave_encashment",
  {
    amount: numeric("amount"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    employeeId: text("employee_id").notNull(),
    encashableDays: numeric("encashable_days").notNull(),
    encashedDays: numeric("encashed_days").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    leavePeriod: text("leave_period").notNull(),
    leaveType: text("leave_type").notNull(),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectionReason: text("rejection_reason"),
    status: leaveEncashmentStatusEnum("status").notNull().default("pending"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_leave_encashment_employee_id").on(table.employeeId),
    index("idx_leave_encashment_status").on(table.status),
  ],
);

export const leaveBlockList = pgTable(
  "leave_block_list",
  {
    company: text("company"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    department: text("department"),
    fromDate: date("from_date").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    reason: text("reason"),
    scope: leaveBlockListScopeEnum("scope").notNull(),
    toDate: date("to_date").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_leave_block_list_is_active").on(table.isActive)],
);

export const leaveAdjustment = pgTable(
  "leave_adjustment",
  {
    adjustedBy: text("adjusted_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    days: numeric("days").notNull(),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    leaveLedgerEntry: text("leave_ledger_entry").notNull(),
    leavePeriod: text("leave_period"),
    leaveType: text("leave_type").notNull(),
    reason: text("reason").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_leave_adjustment_employee_id").on(table.employeeId)],
);

export const leaveLedgerEntry = pgTable(
  "leave_ledger_entry",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    days: numeric("days").notNull(),
    description: text("description").notNull(),
    employeeId: text("employee_id").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    leaveApplication: text("leave_application"),
    leaveType: text("leave_type").notNull(),
    transactionType: text("transaction_type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_leave_ledger_entry_employee_id").on(table.employeeId),
    index("idx_leave_ledger_entry_leave_type").on(table.leaveType),
  ],
);

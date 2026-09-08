import { pgEnum } from "drizzle-orm/pg-core";

export const leaveApplicationStatusEnum = pgEnum("hr_leave_application_status", [
  "approved",
  "cancelled",
  "draft",
  "pending",
  "rejected",
]);

export const leaveAllocationStatusEnum = pgEnum("hr_leave_allocation_status", [
  "active",
  "cancelled",
  "expired",
]);

export const compensatoryLeaveStatusEnum = pgEnum("hr_compensatory_leave_status", [
  "approved",
  "pending",
  "rejected",
]);

export const leaveEncashmentStatusEnum = pgEnum("hr_leave_encashment_status", [
  "approved",
  "paid",
  "pending",
  "rejected",
]);

export const earnedLeaveFrequencyEnum = pgEnum("hr_earned_leave_frequency", [
  "half_yearly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const leaveBlockListScopeEnum = pgEnum("hr_leave_block_list_scope", [
  "company",
  "department",
]);

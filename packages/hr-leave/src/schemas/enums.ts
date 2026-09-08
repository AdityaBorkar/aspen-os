import { enum as enum_ } from "valibot";

export const LeaveApplicationStatusSchema = enum_({
  approved: "approved",
  cancelled: "cancelled",
  draft: "draft",
  pending: "pending",
  rejected: "rejected",
});

export const LeaveAllocationStatusSchema = enum_({
  active: "active",
  cancelled: "cancelled",
  expired: "expired",
});

export const CompensatoryLeaveStatusSchema = enum_({
  approved: "approved",
  pending: "pending",
  rejected: "rejected",
});

export const LeaveEncashmentStatusSchema = enum_({
  approved: "approved",
  paid: "paid",
  pending: "pending",
  rejected: "rejected",
});

export const EarnedLeaveFrequencySchema = enum_({
  half_yearly: "half_yearly",
  monthly: "monthly",
  quarterly: "quarterly",
  yearly: "yearly",
});

export const LeaveBlockListScopeSchema = enum_({
  company: "company",
  department: "department",
});

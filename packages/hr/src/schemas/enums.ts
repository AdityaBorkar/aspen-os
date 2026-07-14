import { enum as enum_ } from "valibot";

export const EmployeeStatusSchema = enum_({
  active: "active",
  inactive: "inactive",
  left: "left",
  suspended: "suspended",
});

export const GenderSchema = enum_({
  female: "female",
  male: "male",
  other: "other",
  prefer_not_to_say: "prefer_not_to_say",
});

export const EmploymentTypeSchema = enum_({
  contract: "contract",
  freelance: "freelance",
  intern: "intern",
  part_time: "part_time",
  permanent: "permanent",
  temporary: "temporary",
});

export const AttendanceStatusSchema = enum_({
  absent: "absent",
  half_day: "half_day",
  on_leave: "on_leave",
  present: "present",
  work_from_home: "work_from_home",
});

export const CheckinLogTypeSchema = enum_({
  in: "in",
  out: "out",
});

export const AttendanceRequestStatusSchema = enum_({
  approved: "approved",
  pending: "pending",
  rejected: "rejected",
});

export const ShiftRequestStatusSchema = enum_({
  approved: "approved",
  pending: "pending",
  rejected: "rejected",
});

export const ShiftAssignmentStatusSchema = enum_({
  active: "active",
  completed: "completed",
  inactive: "inactive",
});

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

export const LifecycleTaskStatusSchema = enum_({
  completed: "completed",
  in_progress: "in_progress",
  pending: "pending",
  skipped: "skipped",
});

export const OnboardingStatusSchema = enum_({
  cancelled: "cancelled",
  completed: "completed",
  in_progress: "in_progress",
  pending: "pending",
});

export const SeparationStatusSchema = enum_({
  cancelled: "cancelled",
  completed: "completed",
  in_progress: "in_progress",
  pending: "pending",
});

export const PromotionStatusSchema = enum_({
  approved: "approved",
  completed: "completed",
  pending: "pending",
  rejected: "rejected",
});

export const TransferStatusSchema = enum_({
  approved: "approved",
  completed: "completed",
  pending: "pending",
  rejected: "rejected",
});

export const SkillProficiencySchema = enum_({
  advanced: "advanced",
  beginner: "beginner",
  expert: "expert",
  intermediate: "intermediate",
});

export const OvertimeStatusSchema = enum_({
  approved: "approved",
  pending: "pending",
  rejected: "rejected",
});

export const ExitInterviewStatusSchema = enum_({
  cancelled: "cancelled",
  completed: "completed",
  scheduled: "scheduled",
});

export const FullAndFinalStatusSchema = enum_({
  approved: "approved",
  cancelled: "cancelled",
  draft: "draft",
  paid: "paid",
  pending: "pending",
});

export const HolidayTypeSchema = enum_({
  company: "company",
  optional: "optional",
  public: "public",
  weekly_off: "weekly_off",
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

export const AccessLevelSchema = enum_({
  full: "full",
  manage: "manage",
  read_only: "read_only",
});

export const PermissionActionSchema = enum_({
  approve: "approve",
  create: "create",
  delete: "delete",
  manage: "manage",
  reject: "reject",
  update: "update",
  view: "view",
});

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

export const OnboardingStatusSchema = enum_({
  cancelled: "cancelled",
  completed: "completed",
  in_progress: "in_progress",
  pending: "pending",
});

export const SkillProficiencySchema = enum_({
  advanced: "advanced",
  beginner: "beginner",
  expert: "expert",
  intermediate: "intermediate",
});

export const AccessLevelSchema = enum_({
  full: "full",
  manage: "manage",
  read_only: "read_only",
});

export const PermissionActionSchema = enum_({
  approve: "approve",
  archive: "archive",
  create: "create",
  delete: "delete",
  manage: "manage",
  publish: "publish",
  reject: "reject",
  update: "update",
  view: "view",
});

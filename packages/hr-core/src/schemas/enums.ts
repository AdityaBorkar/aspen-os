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

export const AnnouncementStatusSchema = enum_({
  archived: "archived",
  draft: "draft",
  published: "published",
  scheduled: "scheduled",
});

export const AnnouncementChannelSchema = enum_({
  custom: "custom",
  general: "general",
  hr: "hr",
});

export const AnnouncementPrioritySchema = enum_({
  important: "important",
  normal: "normal",
  urgent: "urgent",
});

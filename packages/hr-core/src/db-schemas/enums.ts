import { NOTIFICATION_SEVERITY } from "@aspen-os/constants";
import { pgEnum } from "drizzle-orm/pg-core";

export const employeeStatusEnum = pgEnum("hr_employee_status", [
  "active",
  "inactive",
  "left",
  "suspended",
]);

export const genderEnum = pgEnum("hr_gender", ["female", "male", "other", "prefer_not_to_say"]);

export const employmentTypeEnum = pgEnum("hr_employment_type", [
  "contract",
  "freelance",
  "intern",
  "part_time",
  "permanent",
  "temporary",
]);

export const lifecycleTaskStatusEnum = pgEnum("hr_lifecycle_task_status", [
  "completed",
  "in_progress",
  "pending",
  "skipped",
]);

export const onboardingStatusEnum = pgEnum("hr_onboarding_status", [
  "cancelled",
  "completed",
  "in_progress",
  "pending",
]);

export const separationStatusEnum = pgEnum("hr_separation_status", [
  "cancelled",
  "completed",
  "in_progress",
  "pending",
]);

export const promotionStatusEnum = pgEnum("hr_promotion_status", [
  "approved",
  "completed",
  "pending",
  "rejected",
]);

export const transferStatusEnum = pgEnum("hr_transfer_status", [
  "approved",
  "completed",
  "pending",
  "rejected",
]);

export const skillProficiencyEnum = pgEnum("hr_skill_proficiency", [
  "advanced",
  "beginner",
  "expert",
  "intermediate",
]);

export const exitInterviewStatusEnum = pgEnum("hr_exit_interview_status", [
  "cancelled",
  "completed",
  "scheduled",
]);

export const fullAndFinalStatusEnum = pgEnum("hr_full_and_final_status", [
  "approved",
  "cancelled",
  "draft",
  "paid",
  "pending",
]);

export const holidayTypeEnum = pgEnum("hr_holiday_type", [
  "company",
  "optional",
  "public",
  "weekly_off",
]);

export const accessLevelEnum = pgEnum("hr_access_level", ["full", "manage", "read_only"]);

export const permissionActionEnum = pgEnum("hr_permission_action", [
  "approve",
  "archive",
  "create",
  "delete",
  "manage",
  "publish",
  "reject",
  "update",
  "view",
]);

export const announcementStatusEnum = pgEnum("hr_announcement_status", [
  "archived",
  "draft",
  "published",
  "scheduled",
]);

export const announcementChannelEnum = pgEnum("hr_announcement_channel", [
  "custom",
  "general",
  "hr",
]);

export const announcementPriorityEnum = pgEnum("hr_announcement_priority", [
  NOTIFICATION_SEVERITY.IMPORTANT,
  NOTIFICATION_SEVERITY.NORMAL,
  NOTIFICATION_SEVERITY.URGENT,
]);

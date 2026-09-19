import { pgEnum } from "drizzle-orm/pg-core";

export const employeeStatusEnum = pgEnum("hr_employee_status", [
  "active",
  "inactive",
  "left",
  "suspended",
]);

export const genderEnum = pgEnum("hr_gender", ["female", "male", "other", "prefer_not_to_say"]);

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

export const onboardingStatusEnum = pgEnum("hr_onboarding_status", [
  "cancelled",
  "completed",
  "in_progress",
  "pending",
]);

export const skillProficiencyEnum = pgEnum("hr_skill_proficiency", [
  "advanced",
  "beginner",
  "expert",
  "intermediate",
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

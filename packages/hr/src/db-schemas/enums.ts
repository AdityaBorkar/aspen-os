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

export const attendanceStatusEnum = pgEnum("hr_attendance_status", [
  "absent",
  "half_day",
  "on_leave",
  "present",
  "work_from_home",
]);

export const checkinLogTypeEnum = pgEnum("hr_checkin_log_type", ["in", "out"]);

export const attendanceRequestStatusEnum = pgEnum("hr_attendance_request_status", [
  "approved",
  "pending",
  "rejected",
]);

export const shiftRequestStatusEnum = pgEnum("hr_shift_request_status", [
  "approved",
  "pending",
  "rejected",
]);

export const shiftAssignmentStatusEnum = pgEnum("hr_shift_assignment_status", [
  "active",
  "completed",
  "inactive",
]);

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

export const overtimeStatusEnum = pgEnum("hr_overtime_status", ["approved", "pending", "rejected"]);

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

export const accessLevelEnum = pgEnum("hr_access_level", ["full", "manage", "read_only"]);

export const permissionActionEnum = pgEnum("hr_permission_action", [
  "approve",
  "create",
  "delete",
  "manage",
  "reject",
  "update",
  "view",
]);

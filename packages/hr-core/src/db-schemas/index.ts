import {
  hrPermission,
  hrRole,
  hrRolePermission,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
} from "#/db-schemas/access";
import { hrAnnouncement, hrAnnouncementRecipient } from "#/db-schemas/announcement";
import {
  employee,
  employeeGroup,
  employeeGroupMember,
  employeeHealthInsurance,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeTransfer,
} from "#/db-schemas/employee";
import {
  exitInterview,
  fullAndFinalStatement,
  onboardingTask,
  separationTask,
} from "#/db-schemas/lifecycle";
import { hrPosition, hrPositionAssignment } from "#/db-schemas/position";
import {
  department,
  designation,
  employeeGrade,
  employmentType,
  holiday,
  holidayList,
  hrSettings,
  payrollSettings,
} from "#/db-schemas/setup";

export {
  hrPermission,
  hrRole,
  hrRolePermission,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
} from "#/db-schemas/access";
export { hrAnnouncement, hrAnnouncementRecipient } from "#/db-schemas/announcement";
export {
  employee,
  employeeGroup,
  employeeGroupMember,
  employeeHealthInsurance,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeTransfer,
} from "#/db-schemas/employee";
export * from "#/db-schemas/enums";
export {
  exitInterview,
  fullAndFinalStatement,
  onboardingTask,
  separationTask,
} from "#/db-schemas/lifecycle";
export { hrPosition, hrPositionAssignment } from "#/db-schemas/position";
export {
  department,
  designation,
  employeeGrade,
  employmentType,
  holiday,
  holidayList,
  hrSettings,
  payrollSettings,
} from "#/db-schemas/setup";

export type HrUser = typeof hrUser.$inferSelect;
export type HrRole = typeof hrRole.$inferSelect;
export type HrPermission = typeof hrPermission.$inferSelect;
export type HrRolePermission = typeof hrRolePermission.$inferSelect;
export type HrUserRole = typeof hrUserRole.$inferSelect;
export type HrUserBranchAccess = typeof hrUserBranchAccess.$inferSelect;

export type NewHrUser = typeof hrUser.$inferInsert;
export type NewHrRole = typeof hrRole.$inferInsert;
export type NewHrPermission = typeof hrPermission.$inferInsert;
export type NewHrRolePermission = typeof hrRolePermission.$inferInsert;
export type NewHrUserRole = typeof hrUserRole.$inferInsert;
export type NewHrUserBranchAccess = typeof hrUserBranchAccess.$inferInsert;

export const dbSchema = {
  department,
  designation,
  employee,
  employeeGrade,
  employeeGroup,
  employeeGroupMember,
  employeeHealthInsurance,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeTransfer,
  employmentType,
  exitInterview,
  fullAndFinalStatement,
  holiday,
  holidayList,
  hrAnnouncement,
  hrAnnouncementRecipient,
  hrPermission,
  hrPosition,
  hrPositionAssignment,
  hrRole,
  hrRolePermission,
  hrSettings,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
  onboardingTask,
  payrollSettings,
  separationTask,
} as const;

export const hrTables = dbSchema;

export const control_plane_schemas = {
  department,
  designation,
  employeeGrade,
  employmentType,
  holiday,
  holidayList,
  hrPermission,
  hrRole,
  hrRolePermission,
  hrSettings,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
  payrollSettings,
} as const;

export const tenant_schemas = {
  employee,
  employeeGroup,
  employeeGroupMember,
  employeeHealthInsurance,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeTransfer,
  exitInterview,
  fullAndFinalStatement,
  hrAnnouncement,
  hrAnnouncementRecipient,
  hrPosition,
  hrPositionAssignment,
  onboardingTask,
  separationTask,
} as const;

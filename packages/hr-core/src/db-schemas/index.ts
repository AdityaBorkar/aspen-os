import {
  hrPermission,
  hrRole,
  hrRolePermission,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
} from "#/db-schemas/access";
import {
  employee,
  employeeGroup,
  employeeGroupMember,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeTransfer,
} from "#/db-schemas/employee";
import {
  accessLevelEnum,
  employeeStatusEnum,
  employmentTypeEnum,
  exitInterviewStatusEnum,
  fullAndFinalStatusEnum,
  genderEnum,
  lifecycleTaskStatusEnum,
  onboardingStatusEnum,
  permissionActionEnum,
  promotionStatusEnum,
  separationStatusEnum,
  skillProficiencyEnum,
  transferStatusEnum,
} from "#/db-schemas/enums";
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
export {
  employee,
  employeeGroup,
  employeeGroupMember,
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
  accessLevelEnum,
  department,
  designation,
  employee,
  employeeGrade,
  employeeGroup,
  employeeGroupMember,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeStatusEnum,
  employeeTransfer,
  employmentType,
  employmentTypeEnum,
  exitInterview,
  exitInterviewStatusEnum,
  fullAndFinalStatusEnum,
  fullAndFinalStatement,
  genderEnum,
  hrPermission,
  hrPosition,
  hrPositionAssignment,
  hrRole,
  hrRolePermission,
  hrSettings,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
  lifecycleTaskStatusEnum,
  onboardingStatusEnum,
  onboardingTask,
  payrollSettings,
  permissionActionEnum,
  promotionStatusEnum,
  separationStatusEnum,
  separationTask,
  skillProficiencyEnum,
  transferStatusEnum,
} as const;

export const hrTables = dbSchema;

export const control_plane_schemas = {
  accessLevelEnum,
  department,
  designation,
  employeeGrade,
  employmentType,
  employmentTypeEnum,
  genderEnum,
  hrPermission,
  hrRole,
  hrRolePermission,
  hrSettings,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
  payrollSettings,
  permissionActionEnum,
} as const;

export const tenant_schemas = {
  accessLevelEnum,
  employee,
  employeeGroup,
  employeeGroupMember,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeStatusEnum,
  employeeTransfer,
  employmentTypeEnum,
  exitInterview,
  exitInterviewStatusEnum,
  fullAndFinalStatusEnum,
  fullAndFinalStatement,
  genderEnum,
  hrPosition,
  hrPositionAssignment,
  lifecycleTaskStatusEnum,
  onboardingStatusEnum,
  onboardingTask,
  permissionActionEnum,
  promotionStatusEnum,
  separationStatusEnum,
  separationTask,
  skillProficiencyEnum,
  transferStatusEnum,
} as const;

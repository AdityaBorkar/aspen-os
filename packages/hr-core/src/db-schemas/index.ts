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
  genderEnum,
  onboardingStatusEnum,
  permissionActionEnum,
  promotionStatusEnum,
  separationStatusEnum,
  skillProficiencyEnum,
  transferStatusEnum,
} from "#/db-schemas/enums";
import { department, hrSettings, payrollSettings } from "#/db-schemas/setup";

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
export { department, hrSettings, payrollSettings } from "#/db-schemas/setup";

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
  employee,
  employeeGroup,
  employeeGroupMember,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeStatusEnum,
  employeeTransfer,
  genderEnum,
  hrPermission,
  hrRole,
  hrRolePermission,
  hrSettings,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
  onboardingStatusEnum,
  payrollSettings,
  permissionActionEnum,
  promotionStatusEnum,
  separationStatusEnum,
  skillProficiencyEnum,
  transferStatusEnum,
} as const;

export const hrTables = dbSchema;

export const control_plane_schemas = {} as const;

export const tenant_schemas = {
  accessLevelEnum,
  department,
  employee,
  employeeGroup,
  employeeGroupMember,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeStatusEnum,
  employeeTransfer,
  genderEnum,
  hrPermission,
  hrRole,
  hrRolePermission,
  hrSettings,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
  onboardingStatusEnum,
  payrollSettings,
  permissionActionEnum,
  promotionStatusEnum,
  separationStatusEnum,
  skillProficiencyEnum,
  transferStatusEnum,
} as const;

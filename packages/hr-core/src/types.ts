import type {
  EmployeeStatusSchema,
  OnboardingStatusSchema,
  PromotionStatusSchema,
  SeparationStatusSchema,
  TransferStatusSchema,
} from "#/schemas";

import type { InferOutput } from "valibot";

export type EmployeeStatus = InferOutput<typeof EmployeeStatusSchema>;
export type OnboardingStatus = InferOutput<typeof OnboardingStatusSchema>;
export type PromotionStatus = InferOutput<typeof PromotionStatusSchema>;
export type SeparationStatus = InferOutput<typeof SeparationStatusSchema>;
export type TransferStatus = InferOutput<typeof TransferStatusSchema>;

export {
  EmployeeStatusSchema,
  OnboardingStatusSchema,
  PromotionStatusSchema,
  SeparationStatusSchema,
  TransferStatusSchema,
} from "#/schemas";

export type {
  AddGroupMemberInput,
  AssignPermissionInput,
  AssignRoleInput,
  CreateDepartmentInput,
  CreateEmployeeGroupInput,
  CreateEmployeeInput,
  CreateHrPermissionInput,
  CreateHrRoleInput,
  CreateHrUserInput,
  CreateOnboardingInput,
  CreatePromotionInput,
  CreateSeparationInput,
  CreateSkillMapInput,
  CreateTransferInput,
  DepartmentFilters,
  EmployeeFilters,
  ExportPayrollInput,
  GrantBranchAccessInput,
  HrPermissionFilters,
  HrRoleFilters,
  HrUserFilters,
  MoveDepartmentInput,
  OnboardEmployeeInput,
  OnboardingFilters,
  PromotionFilters,
  SeparationFilters,
  SetDepartmentHeadInput,
  TransferFilters,
  UpdateBranchAccessInput,
  UpdateDepartmentInput,
  UpdateEmployeeGroupInput,
  UpdateEmployeeInput,
  UpdateHrRoleInput,
  UpdateHrSettingsInput,
  UpdateHrUserInput,
  UpdateOnboardingInput,
  UpdatePayrollSettingsInput,
  UpdatePromotionInput,
  UpdateSeparationInput,
  UpdateSkillMapInput,
  UpdateTransferInput,
} from "#/schemas";
export {
  AccessLevelSchema,
  AddGroupMemberSchema,
  AssignPermissionSchema,
  AssignRoleSchema,
  CreateDepartmentSchema,
  CreateEmployeeGroupSchema,
  CreateEmployeeSchema,
  CreateHrPermissionSchema,
  CreateHrRoleSchema,
  CreateHrUserSchema,
  CreateOnboardingSchema,
  CreatePromotionSchema,
  CreateSeparationSchema,
  CreateSkillMapSchema,
  CreateTransferSchema,
  DepartmentFiltersSchema,
  EmployeeFiltersSchema,
  ExportPayrollSchema,
  GrantBranchAccessSchema,
  HrPermissionFiltersSchema,
  HrRoleFiltersSchema,
  HrUserFiltersSchema,
  OnboardEmployeeSchema,
  OnboardingFiltersSchema,
  PermissionActionSchema,
  PromotionFiltersSchema,
  SeparationFiltersSchema,
  MoveDepartmentSchema,
  SetDepartmentHeadSchema,
  TransferFiltersSchema,
  UpdateBranchAccessSchema,
  UpdateDepartmentSchema,
  UpdateEmployeeGroupSchema,
  UpdateEmployeeSchema,
  UpdateHrRoleSchema,
  UpdateHrSettingsSchema,
  UpdateHrUserSchema,
  UpdateOnboardingSchema,
  UpdatePayrollSettingsSchema,
  UpdatePromotionSchema,
  UpdateSeparationSchema,
  UpdateSkillMapSchema,
  UpdateTransferSchema,
} from "#/schemas";

export interface EmployeeTreeNode {
  children: EmployeeTreeNode[];
  id: string;
  image: string | null;
  name: string;
}

export interface OrgTreeNode {
  children: OrgTreeNode[];
  department: string;
  id: string;
  image: string | null;
  name: string;
}

export interface DepartmentTreeNode {
  children: DepartmentTreeNode[];
  code: string;
  employeeCount: number;
  headEmployeeId: string | null;
  id: string;
  name: string;
}

export interface ResolvedPermission {
  action: string;
  module: string;
}

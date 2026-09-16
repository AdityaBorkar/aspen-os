export type {
  AddGroupMemberInput,
  AssignEmployeeInput,
  AssignPermissionInput,
  AssignRoleInput,
  CreateDepartmentInput,
  CreateDesignationInput,
  CreateEmployeeGradeInput,
  CreateEmployeeGroupInput,
  CreateEmployeeInput,
  CreateEmploymentTypeInput,
  CreateExitInterviewInput,
  CreateFullAndFinalInput,
  CreateHealthInsuranceInput,
  CreateHrPermissionInput,
  CreateHrRoleInput,
  CreateHrUserInput,
  CreateOnboardingInput,
  CreateOnboardingTaskInput,
  CreatePromotionInput,
  CreatePositionInput,
  CreateSeparationInput,
  CreateSeparationTaskInput,
  CreateSkillMapInput,
  CreateTransferInput,
  DepartmentFilters,
  EmployeeFilters,
  ExitInterviewFilters,
  FullAndFinalFilters,
  GrantBranchAccessInput,
  HrPermissionFilters,
  HrRoleFilters,
  HrUserFilters,
  MoveDepartmentInput,
  OnboardingFilters,
  PromotionFilters,
  PositionFilters,
  SeparationFilters,
  SetDepartmentHeadInput,
  TransferFilters,
  TransferAssignmentInput,
  UpdateBranchAccessInput,
  UpdateDepartmentInput,
  UpdateDesignationInput,
  UpdateEmployeeGradeInput,
  UpdateEmployeeGroupInput,
  UpdateEmployeeInput,
  UpdateEmploymentTypeInput,
  UpdateExitInterviewInput,
  UpdateFullAndFinalInput,
  UpdateHealthInsuranceInput,
  UpdateHrRoleInput,
  UpdateHrSettingsInput,
  UpdateHrUserInput,
  UpdateOnboardingInput,
  UpdateOnboardingTaskInput,
  UpdatePayrollSettingsInput,
  UpdatePositionInput,
  UpdatePromotionInput,
  UpdateSeparationInput,
  UpdateSeparationTaskInput,
  UpdateSkillMapInput,
  UpdateTransferInput,
} from "#/schemas";
export {
  AccessLevelSchema,
  AddGroupMemberSchema,
  AssignPermissionSchema,
  AssignRoleSchema,
  CreateDepartmentSchema,
  CreateDesignationSchema,
  CreateEmployeeGradeSchema,
  CreateEmployeeGroupSchema,
  CreateEmployeeSchema,
  CreateEmploymentTypeSchema,
  CreateExitInterviewSchema,
  CreateFullAndFinalSchema,
  CreateHealthInsuranceSchema,
  CreateHrPermissionSchema,
  CreateHrRoleSchema,
  CreateHrUserSchema,
  CreateOnboardingSchema,
  CreateOnboardingTaskSchema,
  CreatePromotionSchema,
  CreateSeparationSchema,
  CreateSeparationTaskSchema,
  CreateSkillMapSchema,
  CreateTransferSchema,
  DepartmentFiltersSchema,
  EmployeeFiltersSchema,
  ExitInterviewFiltersSchema,
  FullAndFinalFiltersSchema,
  GrantBranchAccessSchema,
  HrPermissionFiltersSchema,
  HrRoleFiltersSchema,
  HrUserFiltersSchema,
  OnboardingFiltersSchema,
  PermissionActionSchema,
  PromotionFiltersSchema,
  SeparationFiltersSchema,
  PositionFiltersSchema,
  MoveDepartmentSchema,
  SetDepartmentHeadSchema,
  TransferFiltersSchema,
  AssignEmployeeSchema,
  TransferAssignmentSchema,
  CreatePositionSchema,
  UpdatePositionSchema,
  UpdateBranchAccessSchema,
  UpdateDepartmentSchema,
  UpdateDesignationSchema,
  UpdateEmployeeGradeSchema,
  UpdateEmployeeGroupSchema,
  UpdateEmployeeSchema,
  UpdateEmploymentTypeSchema,
  UpdateExitInterviewSchema,
  UpdateFullAndFinalSchema,
  UpdateHealthInsuranceSchema,
  UpdateHrRoleSchema,
  UpdateHrSettingsSchema,
  UpdateHrUserSchema,
  UpdateOnboardingSchema,
  UpdateOnboardingTaskSchema,
  UpdatePayrollSettingsSchema,
  UpdatePromotionSchema,
  UpdateSeparationSchema,
  UpdateSeparationTaskSchema,
  UpdateSkillMapSchema,
  UpdateTransferSchema,
} from "#/schemas";

export interface EmployeeTreeNode {
  children: EmployeeTreeNode[];
  designation: string;
  id: string;
  image: string | null;
  name: string;
}

export interface OrgTreeNode {
  children: OrgTreeNode[];
  department: string;
  designation: string;
  id: string;
  image: string | null;
  name: string;
  position: string | null;
}

export interface PositionIncumbent {
  designation: string;
  employeeId: string;
  image: string | null;
  name: string;
}

export interface PositionTreeNode {
  branch: string | null;
  children: PositionTreeNode[];
  department: string;
  id: string;
  incumbents: PositionIncumbent[];
  name: string;
}

export interface DepartmentTreeNode {
  children: DepartmentTreeNode[];
  code: string;
  employeeCount: number;
  headEmployeeId: string | null;
  id: string;
  name: string;
  positionCount: number;
}

export interface ResolvedPermission {
  action: string;
  module: string;
}

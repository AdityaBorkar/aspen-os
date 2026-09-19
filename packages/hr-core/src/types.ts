export type {
  AddGroupMemberInput,
  AssignEmployeeInput,
  AssignPermissionInput,
  AssignRoleInput,
  CreateDepartmentInput,
  CreateEmployeeGroupInput,
  CreateEmployeeInput,
  CreateHrPermissionInput,
  CreateHrRoleInput,
  CreateHrUserInput,
  CreatePromotionInput,
  CreatePositionInput,
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
  PromotionFilters,
  PositionFilters,
  SeparationFilters,
  SetDepartmentHeadInput,
  TransferFilters,
  TransferAssignmentInput,
  UpdateBranchAccessInput,
  UpdateDepartmentInput,
  UpdateEmployeeGroupInput,
  UpdateEmployeeInput,
  UpdateHrRoleInput,
  UpdateHrSettingsInput,
  UpdateHrUserInput,
  UpdatePayrollSettingsInput,
  UpdatePositionInput,
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
  UpdateEmployeeGroupSchema,
  UpdateEmployeeSchema,
  UpdateHrRoleSchema,
  UpdateHrSettingsSchema,
  UpdateHrUserSchema,
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
  position: string | null;
}

export interface PositionIncumbent {
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

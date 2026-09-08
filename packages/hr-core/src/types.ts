export type {
  AddGroupMemberInput,
  AnnouncementAudienceInput,
  AnnouncementFilters,
  AssignEmployeeInput,
  AssignPermissionInput,
  AssignRoleInput,
  CreateAnnouncementInput,
  CreateDepartmentInput,
  CreateDesignationInput,
  CreateEmployeeGradeInput,
  CreateEmployeeGroupInput,
  CreateEmployeeInput,
  CreateEmploymentTypeInput,
  CreateExitInterviewInput,
  CreateFullAndFinalInput,
  CreateHealthInsuranceInput,
  CreateHolidayInput,
  CreateHolidayListInput,
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
  RecipientListFilters,
  SeparationFilters,
  SetDepartmentHeadInput,
  TransferFilters,
  TransferAssignmentInput,
  UpdateAnnouncementInput,
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
  UpdateHolidayInput,
  UpdateHolidayListInput,
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
  AnnouncementAudienceSchema,
  AnnouncementChannelSchema,
  AnnouncementFiltersSchema,
  AnnouncementPrioritySchema,
  AnnouncementStatusSchema,
  AssignPermissionSchema,
  AssignRoleSchema,
  CreateAnnouncementSchema,
  CreateDepartmentSchema,
  CreateDesignationSchema,
  CreateEmployeeGradeSchema,
  CreateEmployeeGroupSchema,
  CreateEmployeeSchema,
  CreateEmploymentTypeSchema,
  CreateExitInterviewSchema,
  CreateFullAndFinalSchema,
  CreateHealthInsuranceSchema,
  CreateHolidayListSchema,
  CreateHolidaySchema,
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
  RecipientListFiltersSchema,
  SeparationFiltersSchema,
  PositionFiltersSchema,
  MoveDepartmentSchema,
  SetDepartmentHeadSchema,
  TransferFiltersSchema,
  AssignEmployeeSchema,
  TransferAssignmentSchema,
  CreatePositionSchema,
  UpdateAnnouncementSchema,
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
  UpdateHolidayListSchema,
  UpdateHolidaySchema,
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

export type {
  CompensatoryLeaveFilters,
  CreateCompensatoryLeaveInput,
  CreateLeaveAdjustmentInput,
  CreateLeaveAllocationInput,
  CreateLeaveApplicationInput,
  CreateLeaveBlockListInput,
  CreateLeaveEncashmentInput,
  CreateLeavePeriodInput,
  CreateLeavePolicyAssignmentInput,
  CreateLeavePolicyDetailInput,
  CreateLeavePolicyInput,
  CreateLeaveTypeInput,
  LeaveAllocationFilters,
  LeaveApplicationFilters,
  LeaveBlockListFilters,
  LeaveEncashmentFilters,
  LeavePolicyAssignmentFilters,
  UpdateCompensatoryLeaveInput,
  UpdateLeaveAllocationInput,
  UpdateLeaveApplicationInput,
  UpdateLeaveBlockListInput,
  UpdateLeaveEncashmentInput,
  UpdateLeavePeriodInput,
  UpdateLeavePolicyAssignmentInput,
  UpdateLeavePolicyInput,
  UpdateLeaveTypeInput,
} from "#/schemas";
export {
  CompensatoryLeaveFiltersSchema,
  CreateCompensatoryLeaveSchema,
  CreateLeaveAdjustmentSchema,
  CreateLeaveAllocationSchema,
  CreateLeaveApplicationSchema,
  CreateLeaveBlockListSchema,
  CreateLeaveEncashmentSchema,
  CreateLeavePeriodSchema,
  CreateLeavePolicyAssignmentSchema,
  CreateLeavePolicyDetailSchema,
  CreateLeavePolicySchema,
  CreateLeaveTypeSchema,
  LeaveAllocationFiltersSchema,
  LeaveApplicationFiltersSchema,
  LeaveBlockListFiltersSchema,
  LeaveEncashmentFiltersSchema,
  LeavePolicyAssignmentFiltersSchema,
  UpdateCompensatoryLeaveSchema,
  UpdateLeaveAllocationSchema,
  UpdateLeaveApplicationSchema,
  UpdateLeaveBlockListSchema,
  UpdateLeaveEncashmentSchema,
  UpdateLeavePeriodSchema,
  UpdateLeavePolicyAssignmentSchema,
  UpdateLeavePolicySchema,
  UpdateLeaveTypeSchema,
} from "#/schemas";

export interface LeaveBalance {
  allocated: number;
  carryForwarded: number;
  earned: number;
  leaveType: string;
  remaining: number;
  used: number;
}

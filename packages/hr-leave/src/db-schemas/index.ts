import {
  compensatoryLeaveStatusEnum,
  earnedLeaveFrequencyEnum,
  holidayTypeEnum,
  leaveAllocationStatusEnum,
  leaveApplicationStatusEnum,
  leaveBlockListScopeEnum,
  leaveEncashmentStatusEnum,
} from "#/db-schemas/enums";
import { holiday, holidayList } from "#/db-schemas/holiday";
import {
  compensatoryLeaveRequest,
  leaveAdjustment,
  leaveAllocation,
  leaveApplication,
  leaveBlockList,
  leaveEncashment,
  leaveLedgerEntry,
  leavePeriod,
  leavePolicy,
  leavePolicyAssignment,
  leavePolicyDetail,
  leaveType,
} from "#/db-schemas/leave";

export * from "#/db-schemas/enums";
export {
  compensatoryLeaveRequest,
  leaveAdjustment,
  leaveAllocation,
  leaveApplication,
  leaveBlockList,
  leaveEncashment,
  leaveLedgerEntry,
  leavePeriod,
  leavePolicy,
  leavePolicyAssignment,
  leavePolicyDetail,
  leaveType,
} from "#/db-schemas/leave";
export { holiday, holidayList } from "#/db-schemas/holiday";

export const dbSchema = {
  compensatoryLeaveRequest,
  compensatoryLeaveStatusEnum,
  earnedLeaveFrequencyEnum,
  holiday,
  holidayList,
  holidayTypeEnum,
  leaveAdjustment,
  leaveAllocation,
  leaveAllocationStatusEnum,
  leaveApplication,
  leaveApplicationStatusEnum,
  leaveBlockList,
  leaveBlockListScopeEnum,
  leaveEncashment,
  leaveEncashmentStatusEnum,
  leaveLedgerEntry,
  leavePeriod,
  leavePolicy,
  leavePolicyAssignment,
  leavePolicyDetail,
  leaveType,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = {
  compensatoryLeaveRequest,
  compensatoryLeaveStatusEnum,
  earnedLeaveFrequencyEnum,
  holiday,
  holidayList,
  holidayTypeEnum,
  leaveAdjustment,
  leaveAllocation,
  leaveAllocationStatusEnum,
  leaveApplication,
  leaveApplicationStatusEnum,
  leaveBlockList,
  leaveBlockListScopeEnum,
  leaveEncashment,
  leaveEncashmentStatusEnum,
  leaveLedgerEntry,
  leavePeriod,
  leavePolicy,
  leavePolicyAssignment,
  leavePolicyDetail,
  leaveType,
} as const;

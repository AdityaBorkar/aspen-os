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
  holiday,
  holidayList,
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
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = {
  compensatoryLeaveRequest,
  holiday,
  holidayList,
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
} as const;

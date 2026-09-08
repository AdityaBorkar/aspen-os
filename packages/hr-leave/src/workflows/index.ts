import { createLeaveAdjustment } from "#/workflows/leave/adjustment/create";
import { listLeaveAdjustments } from "#/workflows/leave/adjustments/list";
import { getLeaveAllocationById } from "#/workflows/leave/allocation/by-id/get";
import { createLeaveAllocation } from "#/workflows/leave/allocation/create";
import { deleteLeaveAllocation } from "#/workflows/leave/allocation/delete";
import { updateLeaveAllocation } from "#/workflows/leave/allocation/update";
import { listLeaveAllocations } from "#/workflows/leave/allocations/list";
import { approveLeaveApplication } from "#/workflows/leave/application/approve";
import { getLeaveApplicationById } from "#/workflows/leave/application/by-id/get";
import { cancelLeaveApplication } from "#/workflows/leave/application/cancel";
import { createLeaveApplication } from "#/workflows/leave/application/create";
import { deleteLeaveApplication } from "#/workflows/leave/application/delete";
import { rejectLeaveApplication } from "#/workflows/leave/application/reject";
import { updateLeaveApplication } from "#/workflows/leave/application/update";
import { listLeaveApplications } from "#/workflows/leave/applications/list";
import { getLeaveBalance } from "#/workflows/leave/balance/get";
import { getLeaveBlockListById } from "#/workflows/leave/block-list/by-id/get";
import { createLeaveBlockList } from "#/workflows/leave/block-list/create";
import { deleteLeaveBlockList } from "#/workflows/leave/block-list/delete";
import { updateLeaveBlockList } from "#/workflows/leave/block-list/update";
import { listLeaveBlockLists } from "#/workflows/leave/block-lists/list";
import { approveCompensatoryLeave } from "#/workflows/leave/compensatory-leave/approve";
import { getCompensatoryLeaveById } from "#/workflows/leave/compensatory-leave/by-id/get";
import { createCompensatoryLeave } from "#/workflows/leave/compensatory-leave/create";
import { deleteCompensatoryLeave } from "#/workflows/leave/compensatory-leave/delete";
import { rejectCompensatoryLeave } from "#/workflows/leave/compensatory-leave/reject";
import { updateCompensatoryLeave } from "#/workflows/leave/compensatory-leave/update";
import { listCompensatoryLeaves } from "#/workflows/leave/compensatory-leaves/list";
import { approveLeaveEncashment } from "#/workflows/leave/encashment/approve";
import { getLeaveEncashmentById } from "#/workflows/leave/encashment/by-id/get";
import { createLeaveEncashment } from "#/workflows/leave/encashment/create";
import { deleteLeaveEncashment } from "#/workflows/leave/encashment/delete";
import { markLeaveEncashmentPaid } from "#/workflows/leave/encashment/mark-paid";
import { rejectLeaveEncashment } from "#/workflows/leave/encashment/reject";
import { updateLeaveEncashment } from "#/workflows/leave/encashment/update";
import { listLeaveEncashments } from "#/workflows/leave/encashments/list";
import { listLedgerEntries } from "#/workflows/leave/ledger-entries/list";
import { getLeavePeriodById } from "#/workflows/leave/period/by-id/get";
import { createLeavePeriod } from "#/workflows/leave/period/create";
import { deleteLeavePeriod } from "#/workflows/leave/period/delete";
import { updateLeavePeriod } from "#/workflows/leave/period/update";
import { listLeavePeriods } from "#/workflows/leave/periods/list";
import { listLeavePolicies } from "#/workflows/leave/policies/list";
import { getLeavePolicyAssignmentById } from "#/workflows/leave/policy-assignment/by-id/get";
import { createLeavePolicyAssignment } from "#/workflows/leave/policy-assignment/create";
import { deleteLeavePolicyAssignment } from "#/workflows/leave/policy-assignment/delete";
import { updateLeavePolicyAssignment } from "#/workflows/leave/policy-assignment/update";
import { listLeavePolicyAssignments } from "#/workflows/leave/policy-assignments/list";
import { createLeavePolicyDetail } from "#/workflows/leave/policy-detail/create";
import { deleteLeavePolicyDetail } from "#/workflows/leave/policy-detail/delete";
import { listLeavePolicyDetails } from "#/workflows/leave/policy-details/list";
import { getLeavePolicyById } from "#/workflows/leave/policy/by-id/get";
import { createLeavePolicy } from "#/workflows/leave/policy/create";
import { deleteLeavePolicy } from "#/workflows/leave/policy/delete";
import { updateLeavePolicy } from "#/workflows/leave/policy/update";
import { getLeaveTypeById } from "#/workflows/leave/type/by-id/get";
import { createLeaveType } from "#/workflows/leave/type/create";
import { deleteLeaveType } from "#/workflows/leave/type/delete";
import { updateLeaveType } from "#/workflows/leave/type/update";
import { listLeaveTypes } from "#/workflows/leave/types/list";

export const leave = {
  approveCompensatoryLeave,
  approveLeaveApplication,
  approveLeaveEncashment,
  cancelLeaveApplication,
  createCompensatoryLeave,
  createLeaveAdjustment,
  createLeaveAllocation,
  createLeaveApplication,
  createLeaveBlockList,
  createLeaveEncashment,
  createLeavePeriod,
  createLeavePolicy,
  createLeavePolicyAssignment,
  createLeavePolicyDetail,
  createLeaveType,
  deleteCompensatoryLeave,
  deleteLeaveAllocation,
  deleteLeaveApplication,
  deleteLeaveBlockList,
  deleteLeaveEncashment,
  deleteLeavePeriod,
  deleteLeavePolicy,
  deleteLeavePolicyAssignment,
  deleteLeavePolicyDetail,
  deleteLeaveType,
  getCompensatoryLeaveById,
  getLeaveAllocationById,
  getLeaveApplicationById,
  getLeaveBalance,
  getLeaveBlockListById,
  getLeaveEncashmentById,
  getLeavePeriodById,
  getLeavePolicyAssignmentById,
  getLeavePolicyById,
  getLeaveTypeById,
  listCompensatoryLeaves,
  listLeaveAdjustments,
  listLeaveAllocations,
  listLeaveApplications,
  listLeaveBlockLists,
  listLeaveEncashments,
  listLeavePeriods,
  listLeavePolicies,
  listLeavePolicyAssignments,
  listLeavePolicyDetails,
  listLeaveTypes,
  listLedgerEntries,
  markLeaveEncashmentPaid,
  rejectCompensatoryLeave,
  rejectLeaveApplication,
  rejectLeaveEncashment,
  updateCompensatoryLeave,
  updateLeaveAllocation,
  updateLeaveApplication,
  updateLeaveBlockList,
  updateLeaveEncashment,
  updateLeavePeriod,
  updateLeavePolicy,
  updateLeavePolicyAssignment,
  updateLeaveType,
} as const;

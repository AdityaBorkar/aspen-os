import { createHolidayList } from "#/workflows/config/holiday-list/create";
import { deleteHolidayList } from "#/workflows/config/holiday-list/delete";
import { getHolidayList } from "#/workflows/config/holiday-list/get";
import { listHolidayLists } from "#/workflows/config/holiday-list/list";
import { updateHolidayList } from "#/workflows/config/holiday-list/update";
import { listHolidaysByList } from "#/workflows/config/holiday/by-list/list";
import { createHoliday } from "#/workflows/config/holiday/create";
import { deleteHoliday } from "#/workflows/config/holiday/delete";
import { getHoliday } from "#/workflows/config/holiday/get";
import { updateHoliday } from "#/workflows/config/holiday/update";
import { createLeaveAdjustment } from "#/workflows/leave/adjustment/create";
import { listLeaveAdjustments } from "#/workflows/leave/adjustment/list";
import { createLeaveAllocation } from "#/workflows/leave/allocation/create";
import { deleteLeaveAllocation } from "#/workflows/leave/allocation/delete";
import { getLeaveAllocation } from "#/workflows/leave/allocation/get";
import { listLeaveAllocations } from "#/workflows/leave/allocation/list";
import { updateLeaveAllocation } from "#/workflows/leave/allocation/update";
import { approveLeaveApplication } from "#/workflows/leave/application/approve";
import { cancelLeaveApplication } from "#/workflows/leave/application/cancel";
import { createLeaveApplication } from "#/workflows/leave/application/create";
import { deleteLeaveApplication } from "#/workflows/leave/application/delete";
import { getLeaveApplication } from "#/workflows/leave/application/get";
import { listLeaveApplications } from "#/workflows/leave/application/list";
import { rejectLeaveApplication } from "#/workflows/leave/application/reject";
import { updateLeaveApplication } from "#/workflows/leave/application/update";
import { getLeaveBalance } from "#/workflows/leave/balance/get";
import { createLeaveBlockList } from "#/workflows/leave/block-list/create";
import { deleteLeaveBlockList } from "#/workflows/leave/block-list/delete";
import { getLeaveBlockList } from "#/workflows/leave/block-list/get";
import { listLeaveBlockLists } from "#/workflows/leave/block-list/list";
import { updateLeaveBlockList } from "#/workflows/leave/block-list/update";
import { approveCompensatoryLeave } from "#/workflows/leave/compensatory-leave/approve";
import { createCompensatoryLeave } from "#/workflows/leave/compensatory-leave/create";
import { deleteCompensatoryLeave } from "#/workflows/leave/compensatory-leave/delete";
import { getCompensatoryLeave } from "#/workflows/leave/compensatory-leave/get";
import { listCompensatoryLeaves } from "#/workflows/leave/compensatory-leave/list";
import { rejectCompensatoryLeave } from "#/workflows/leave/compensatory-leave/reject";
import { updateCompensatoryLeave } from "#/workflows/leave/compensatory-leave/update";
import { approveLeaveEncashment } from "#/workflows/leave/encashment/approve";
import { createLeaveEncashment } from "#/workflows/leave/encashment/create";
import { deleteLeaveEncashment } from "#/workflows/leave/encashment/delete";
import { getLeaveEncashment } from "#/workflows/leave/encashment/get";
import { listLeaveEncashments } from "#/workflows/leave/encashment/list";
import { markLeaveEncashmentPaid } from "#/workflows/leave/encashment/mark-paid";
import { rejectLeaveEncashment } from "#/workflows/leave/encashment/reject";
import { updateLeaveEncashment } from "#/workflows/leave/encashment/update";
import { listLedgerEntries } from "#/workflows/leave/ledger-entry/list";
import { createLeavePeriod } from "#/workflows/leave/period/create";
import { deleteLeavePeriod } from "#/workflows/leave/period/delete";
import { getLeavePeriod } from "#/workflows/leave/period/get";
import { listLeavePeriods } from "#/workflows/leave/period/list";
import { updateLeavePeriod } from "#/workflows/leave/period/update";
import { createLeavePolicyAssignment } from "#/workflows/leave/policy-assignment/create";
import { deleteLeavePolicyAssignment } from "#/workflows/leave/policy-assignment/delete";
import { getLeavePolicyAssignment } from "#/workflows/leave/policy-assignment/get";
import { listLeavePolicyAssignments } from "#/workflows/leave/policy-assignment/list";
import { updateLeavePolicyAssignment } from "#/workflows/leave/policy-assignment/update";
import { createLeavePolicyDetail } from "#/workflows/leave/policy-detail/create";
import { deleteLeavePolicyDetail } from "#/workflows/leave/policy-detail/delete";
import { listLeavePolicyDetails } from "#/workflows/leave/policy-detail/list";
import { createLeavePolicy } from "#/workflows/leave/policy/create";
import { deleteLeavePolicy } from "#/workflows/leave/policy/delete";
import { getLeavePolicy } from "#/workflows/leave/policy/get";
import { listLeavePolicies } from "#/workflows/leave/policy/list";
import { updateLeavePolicy } from "#/workflows/leave/policy/update";
import { createLeaveType } from "#/workflows/leave/type/create";
import { deleteLeaveType } from "#/workflows/leave/type/delete";
import { getLeaveType } from "#/workflows/leave/type/get";
import { listLeaveTypes } from "#/workflows/leave/type/list";
import { updateLeaveType } from "#/workflows/leave/type/update";

export const leave = {
  adjustments: {
    create: createLeaveAdjustment,
    list: listLeaveAdjustments,
  },
  allocations: {
    create: createLeaveAllocation,
    delete: deleteLeaveAllocation,
    get: getLeaveAllocation,
    list: listLeaveAllocations,
    update: updateLeaveAllocation,
  },
  applications: {
    approve: approveLeaveApplication,
    cancel: cancelLeaveApplication,
    create: createLeaveApplication,
    delete: deleteLeaveApplication,
    get: getLeaveApplication,
    list: listLeaveApplications,
    reject: rejectLeaveApplication,
    update: updateLeaveApplication,
  },
  balance: {
    get: getLeaveBalance,
  },
  blockLists: {
    create: createLeaveBlockList,
    delete: deleteLeaveBlockList,
    get: getLeaveBlockList,
    list: listLeaveBlockLists,
    update: updateLeaveBlockList,
  },
  compensatoryLeaves: {
    approve: approveCompensatoryLeave,
    create: createCompensatoryLeave,
    delete: deleteCompensatoryLeave,
    get: getCompensatoryLeave,
    list: listCompensatoryLeaves,
    reject: rejectCompensatoryLeave,
    update: updateCompensatoryLeave,
  },
  encashments: {
    approve: approveLeaveEncashment,
    create: createLeaveEncashment,
    delete: deleteLeaveEncashment,
    get: getLeaveEncashment,
    list: listLeaveEncashments,
    markPaid: markLeaveEncashmentPaid,
    reject: rejectLeaveEncashment,
    update: updateLeaveEncashment,
  },
  ledgerEntries: {
    list: listLedgerEntries,
  },
  periods: {
    create: createLeavePeriod,
    delete: deleteLeavePeriod,
    get: getLeavePeriod,
    list: listLeavePeriods,
    update: updateLeavePeriod,
  },
  policies: {
    create: createLeavePolicy,
    delete: deleteLeavePolicy,
    get: getLeavePolicy,
    list: listLeavePolicies,
    update: updateLeavePolicy,
  },
  policyAssignments: {
    create: createLeavePolicyAssignment,
    delete: deleteLeavePolicyAssignment,
    get: getLeavePolicyAssignment,
    list: listLeavePolicyAssignments,
    update: updateLeavePolicyAssignment,
  },
  policyDetails: {
    create: createLeavePolicyDetail,
    delete: deleteLeavePolicyDetail,
    list: listLeavePolicyDetails,
  },
  types: {
    create: createLeaveType,
    delete: deleteLeaveType,
    get: getLeaveType,
    list: listLeaveTypes,
    update: updateLeaveType,
  },
} as const;

export const config = {
  holidayLists: {
    create: createHolidayList,
    delete: deleteHolidayList,
    get: getHolidayList,
    list: listHolidayLists,
    update: updateHolidayList,
  },
  holidays: {
    create: createHoliday,
    delete: deleteHoliday,
    get: getHoliday,
    listByList: listHolidaysByList,
    update: updateHoliday,
  },
} as const;

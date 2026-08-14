import type { DatabaseUnit, Module, ModuleInfra, PubSubUnit } from "@aspen-os/platform/server";

import { acl } from "./auth";
import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub";
import { CRON_SCHEDULES, SCHEDULED_JOBS } from "./utils/constants";
import * as access from "./workflows/barrel-access";
import * as attendance from "./workflows/barrel-attendance";
import * as employee from "./workflows/barrel-employee";
import * as leave from "./workflows/barrel-leave";
import * as lifecycle from "./workflows/barrel-lifecycle";
import * as overtime from "./workflows/barrel-overtime";
import * as setup from "./workflows/barrel-setup";
import * as shift from "./workflows/barrel-shift";

export type HrModuleConfig = {
  country: "INDIA";
};

export class Hr implements Module {
  static create(config: HrModuleConfig): Hr {
    return new Hr(config);
  }

  readonly $name = "hr";
  readonly $dependencies = [] as const;
  readonly $config: HrModuleConfig;

  #pubsub: PubSubUnit | null = null;

  constructor(config: HrModuleConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void {
    this.#pubsub = units.pubsub;
  }

  async $prepareRuntime(): Promise<void> {
    if (!this.#pubsub) {
      return;
    }

    await this.#pubsub.schedule(
      SCHEDULED_JOBS.DAILY_ATTENDANCE_SYNC,
      CRON_SCHEDULES.DAILY_ATTENDANCE_SYNC,
    );
    await this.#pubsub.schedule(
      SCHEDULED_JOBS.DAILY_LEAVE_ACCRUAL,
      CRON_SCHEDULES.DAILY_LEAVE_ACCRUAL,
    );
  }

  async $cleanup(): Promise<void> {
    if (this.#pubsub) {
      await this.#pubsub.unschedule(SCHEDULED_JOBS.DAILY_ATTENDANCE_SYNC);
      await this.#pubsub.unschedule(SCHEDULED_JOBS.DAILY_LEAVE_ACCRUAL);
    }
    this.#pubsub = null;
  }

  readonly access = {
    assignPermissionToRole: access.assignPermissionToRole,
    assignRoleToUser: access.assignRoleToUser,
    createPermission: access.createPermission,
    createRole: access.createRole,
    createUser: access.createUser,
    deletePermission: access.deletePermission,
    deleteRole: access.deleteRole,
    deleteUser: access.deleteUser,
    getAccessibleBranches: access.getAccessibleBranches,
    getPermissionById: access.getPermissionById,
    getRoleById: access.getRoleById,
    getRoleByName: access.getRoleByName,
    getRolePermissions: access.getRolePermissions,
    getUserBranches: access.getUserBranches,
    getUserByEmployeeId: access.getUserByEmployeeId,
    getUserById: access.getUserById,
    getUserByUserId: access.getUserByUserId,
    getUserPermissions: access.getUserPermissions,
    getUserRoles: access.getUserRoles,
    getUserRolesForBranch: access.getUserRolesForBranch,
    grantBranchAccess: access.grantBranchAccess,
    hasBranchAccess: access.hasBranchAccess,
    hasPermission: access.hasPermission,
    listPermissions: access.listPermissions,
    listPermissionsByModule: access.listPermissionsByModule,
    listRoles: access.listRoles,
    listUsers: access.listUsers,
    removePermissionFromRole: access.removePermissionFromRole,
    removeRoleFromUser: access.removeRoleFromUser,
    revokeBranchAccess: access.revokeBranchAccess,
    updateBranchAccess: access.updateBranchAccess,
    updateRole: access.updateRole,
    updateUser: access.updateUser,
  };

  readonly attendance = {
    approveAttendanceRequest: attendance.approveAttendanceRequest,
    create: attendance.create,
    createAttendanceRequest: attendance.createAttendanceRequest,
    createCheckin: attendance.createCheckin,
    deleteAttendanceRequest: attendance.deleteAttendanceRequest,
    deleteCheckin: attendance.deleteCheckin,
    deleteRecord: attendance.deleteRecord,
    getAttendanceRequestById: attendance.getAttendanceRequestById,
    getById: attendance.getById,
    getCheckinById: attendance.getCheckinById,
    getSummary: attendance.getSummary,
    list: attendance.list,
    listAttendanceRequests: attendance.listAttendanceRequests,
    listCheckins: attendance.listCheckins,
    rejectAttendanceRequest: attendance.rejectAttendanceRequest,
    update: attendance.update,
    updateAttendanceRequest: attendance.updateAttendanceRequest,
  };

  readonly employee = {
    activate: employee.activate,
    addGroupMember: employee.addGroupMember,
    create: employee.create,
    createGroup: employee.createGroup,
    createHealthInsurance: employee.createHealthInsurance,
    createSkillMap: employee.createSkillMap,
    deactivate: employee.deactivate,
    deleteGroup: employee.deleteGroup,
    deleteHealthInsurance: employee.deleteHealthInsurance,
    deleteSkillMap: employee.deleteSkillMap,
    getByEmployeeId: employee.getByEmployeeId,
    getById: employee.getById,
    getGroupById: employee.getGroupById,
    getHealthInsuranceById: employee.getHealthInsuranceById,
    getOrganizationalChart: employee.getOrganizationalChart,
    getSkillMapById: employee.getSkillMapById,
    list: employee.list,
    listGroupMembers: employee.listGroupMembers,
    listGroups: employee.listGroups,
    listHealthInsuranceByEmployee: employee.listHealthInsuranceByEmployee,
    listSkillMapByEmployee: employee.listSkillMapByEmployee,
    markAsLeft: employee.markAsLeft,
    removeGroupMember: employee.removeGroupMember,
    update: employee.update,
    updateGroup: employee.updateGroup,
    updateHealthInsurance: employee.updateHealthInsurance,
    updateSkillMap: employee.updateSkillMap,
  };

  readonly leave = {
    approveCompensatoryLeave: leave.approveCompensatoryLeave,
    approveLeaveApplication: leave.approveLeaveApplication,
    approveLeaveEncashment: leave.approveLeaveEncashment,
    cancelLeaveApplication: leave.cancelLeaveApplication,
    createCompensatoryLeave: leave.createCompensatoryLeave,
    createLeaveAdjustment: leave.createLeaveAdjustment,
    createLeaveAllocation: leave.createLeaveAllocation,
    createLeaveApplication: leave.createLeaveApplication,
    createLeaveBlockList: leave.createLeaveBlockList,
    createLeaveEncashment: leave.createLeaveEncashment,
    createLeavePeriod: leave.createLeavePeriod,
    createLeavePolicy: leave.createLeavePolicy,
    createLeavePolicyAssignment: leave.createLeavePolicyAssignment,
    createLeavePolicyDetail: leave.createLeavePolicyDetail,
    createLeaveType: leave.createLeaveType,
    deleteCompensatoryLeave: leave.deleteCompensatoryLeave,
    deleteLeaveAllocation: leave.deleteLeaveAllocation,
    deleteLeaveApplication: leave.deleteLeaveApplication,
    deleteLeaveBlockList: leave.deleteLeaveBlockList,
    deleteLeaveEncashment: leave.deleteLeaveEncashment,
    deleteLeavePeriod: leave.deleteLeavePeriod,
    deleteLeavePolicy: leave.deleteLeavePolicy,
    deleteLeavePolicyAssignment: leave.deleteLeavePolicyAssignment,
    deleteLeavePolicyDetail: leave.deleteLeavePolicyDetail,
    deleteLeaveType: leave.deleteLeaveType,
    getCompensatoryLeaveById: leave.getCompensatoryLeaveById,
    getLeaveAllocationById: leave.getLeaveAllocationById,
    getLeaveApplicationById: leave.getLeaveApplicationById,
    getLeaveBalance: leave.getLeaveBalance,
    getLeaveBlockListById: leave.getLeaveBlockListById,
    getLeaveEncashmentById: leave.getLeaveEncashmentById,
    getLeavePeriodById: leave.getLeavePeriodById,
    getLeavePolicyAssignmentById: leave.getLeavePolicyAssignmentById,
    getLeavePolicyById: leave.getLeavePolicyById,
    getLeaveTypeById: leave.getLeaveTypeById,
    listCompensatoryLeaves: leave.listCompensatoryLeaves,
    listLeaveAdjustments: leave.listLeaveAdjustments,
    listLeaveAllocations: leave.listLeaveAllocations,
    listLeaveApplications: leave.listLeaveApplications,
    listLeaveBlockLists: leave.listLeaveBlockLists,
    listLeaveEncashments: leave.listLeaveEncashments,
    listLeavePeriods: leave.listLeavePeriods,
    listLeavePolicies: leave.listLeavePolicies,
    listLeavePolicyAssignments: leave.listLeavePolicyAssignments,
    listLeavePolicyDetails: leave.listLeavePolicyDetails,
    listLeaveTypes: leave.listLeaveTypes,
    listLedgerEntries: leave.listLedgerEntries,
    markLeaveEncashmentPaid: leave.markLeaveEncashmentPaid,
    rejectCompensatoryLeave: leave.rejectCompensatoryLeave,
    rejectLeaveApplication: leave.rejectLeaveApplication,
    rejectLeaveEncashment: leave.rejectLeaveEncashment,
    updateCompensatoryLeave: leave.updateCompensatoryLeave,
    updateLeaveAllocation: leave.updateLeaveAllocation,
    updateLeaveApplication: leave.updateLeaveApplication,
    updateLeaveBlockList: leave.updateLeaveBlockList,
    updateLeaveEncashment: leave.updateLeaveEncashment,
    updateLeavePeriod: leave.updateLeavePeriod,
    updateLeavePolicy: leave.updateLeavePolicy,
    updateLeavePolicyAssignment: leave.updateLeavePolicyAssignment,
    updateLeaveType: leave.updateLeaveType,
  };

  readonly lifecycle = {
    approveFullAndFinal: lifecycle.approveFullAndFinal,
    approvePromotion: lifecycle.approvePromotion,
    approveTransfer: lifecycle.approveTransfer,
    completeExitInterview: lifecycle.completeExitInterview,
    completeOnboardingTask: lifecycle.completeOnboardingTask,
    completePromotion: lifecycle.completePromotion,
    completeSeparationTask: lifecycle.completeSeparationTask,
    completeTransfer: lifecycle.completeTransfer,
    createExitInterview: lifecycle.createExitInterview,
    createFullAndFinal: lifecycle.createFullAndFinal,
    createOnboarding: lifecycle.createOnboarding,
    createOnboardingTask: lifecycle.createOnboardingTask,
    createPromotion: lifecycle.createPromotion,
    createSeparation: lifecycle.createSeparation,
    createSeparationTask: lifecycle.createSeparationTask,
    createTransfer: lifecycle.createTransfer,
    deleteExitInterview: lifecycle.deleteExitInterview,
    deleteFullAndFinal: lifecycle.deleteFullAndFinal,
    deleteOnboarding: lifecycle.deleteOnboarding,
    deleteOnboardingTask: lifecycle.deleteOnboardingTask,
    deletePromotion: lifecycle.deletePromotion,
    deleteSeparation: lifecycle.deleteSeparation,
    deleteSeparationTask: lifecycle.deleteSeparationTask,
    deleteTransfer: lifecycle.deleteTransfer,
    getExitInterviewById: lifecycle.getExitInterviewById,
    getFullAndFinalById: lifecycle.getFullAndFinalById,
    getOnboardingById: lifecycle.getOnboardingById,
    getOnboardingTaskById: lifecycle.getOnboardingTaskById,
    getPromotionById: lifecycle.getPromotionById,
    getSeparationById: lifecycle.getSeparationById,
    getSeparationTaskById: lifecycle.getSeparationTaskById,
    getTransferById: lifecycle.getTransferById,
    listExitInterviews: lifecycle.listExitInterviews,
    listFullAndFinalStatements: lifecycle.listFullAndFinalStatements,
    listOnboardingTasks: lifecycle.listOnboardingTasks,
    listOnboardings: lifecycle.listOnboardings,
    listPromotions: lifecycle.listPromotions,
    listSeparationTasks: lifecycle.listSeparationTasks,
    listSeparations: lifecycle.listSeparations,
    listTransfers: lifecycle.listTransfers,
    markFullAndFinalPaid: lifecycle.markFullAndFinalPaid,
    rejectPromotion: lifecycle.rejectPromotion,
    rejectTransfer: lifecycle.rejectTransfer,
    updateExitInterview: lifecycle.updateExitInterview,
    updateFullAndFinal: lifecycle.updateFullAndFinal,
    updateOnboarding: lifecycle.updateOnboarding,
    updateOnboardingTask: lifecycle.updateOnboardingTask,
    updatePromotion: lifecycle.updatePromotion,
    updateSeparation: lifecycle.updateSeparation,
    updateSeparationTask: lifecycle.updateSeparationTask,
    updateTransfer: lifecycle.updateTransfer,
  };

  readonly overtime = {
    approveOvertimeSlip: overtime.approveOvertimeSlip,
    createOvertimeSlip: overtime.createOvertimeSlip,
    createOvertimeType: overtime.createOvertimeType,
    deleteOvertimeSlip: overtime.deleteOvertimeSlip,
    deleteOvertimeType: overtime.deleteOvertimeType,
    getOvertimeSlipById: overtime.getOvertimeSlipById,
    getOvertimeSummary: overtime.getOvertimeSummary,
    getOvertimeTypeById: overtime.getOvertimeTypeById,
    listOvertimeSlips: overtime.listOvertimeSlips,
    listOvertimeTypes: overtime.listOvertimeTypes,
    rejectOvertimeSlip: overtime.rejectOvertimeSlip,
    updateOvertimeSlip: overtime.updateOvertimeSlip,
    updateOvertimeType: overtime.updateOvertimeType,
  };

  readonly setup = {
    createDepartment: setup.createDepartment,
    createDesignation: setup.createDesignation,
    createEmployeeGrade: setup.createEmployeeGrade,
    createEmploymentType: setup.createEmploymentType,
    createHoliday: setup.createHoliday,
    createHolidayList: setup.createHolidayList,
    deleteDepartment: setup.deleteDepartment,
    deleteDesignation: setup.deleteDesignation,
    deleteEmployeeGrade: setup.deleteEmployeeGrade,
    deleteEmploymentType: setup.deleteEmploymentType,
    deleteHoliday: setup.deleteHoliday,
    deleteHolidayList: setup.deleteHolidayList,
    getDepartmentById: setup.getDepartmentById,
    getDesignationById: setup.getDesignationById,
    getEmployeeGradeById: setup.getEmployeeGradeById,
    getEmploymentTypeById: setup.getEmploymentTypeById,
    getHolidayById: setup.getHolidayById,
    getHolidayListById: setup.getHolidayListById,
    getHrSettings: setup.getHrSettings,
    getPayrollSettings: setup.getPayrollSettings,
    listDepartments: setup.listDepartments,
    listDesignations: setup.listDesignations,
    listEmployeeGrades: setup.listEmployeeGrades,
    listEmploymentTypes: setup.listEmploymentTypes,
    listHolidayLists: setup.listHolidayLists,
    listHolidaysByList: setup.listHolidaysByList,
    updateDepartment: setup.updateDepartment,
    updateDesignation: setup.updateDesignation,
    updateEmployeeGrade: setup.updateEmployeeGrade,
    updateEmploymentType: setup.updateEmploymentType,
    updateHoliday: setup.updateHoliday,
    updateHolidayList: setup.updateHolidayList,
    updateHrSettings: setup.updateHrSettings,
    updatePayrollSettings: setup.updatePayrollSettings,
  };

  readonly shift = {
    approveShiftRequest: shift.approveShiftRequest,
    createShiftAssignment: shift.createShiftAssignment,
    createShiftLocation: shift.createShiftLocation,
    createShiftRequest: shift.createShiftRequest,
    createShiftSchedule: shift.createShiftSchedule,
    createShiftScheduleAssignment: shift.createShiftScheduleAssignment,
    createShiftType: shift.createShiftType,
    deactivateShiftAssignment: shift.deactivateShiftAssignment,
    deleteShiftAssignment: shift.deleteShiftAssignment,
    deleteShiftLocation: shift.deleteShiftLocation,
    deleteShiftRequest: shift.deleteShiftRequest,
    deleteShiftSchedule: shift.deleteShiftSchedule,
    deleteShiftScheduleAssignment: shift.deleteShiftScheduleAssignment,
    deleteShiftType: shift.deleteShiftType,
    getShiftAssignmentById: shift.getShiftAssignmentById,
    getShiftLocationById: shift.getShiftLocationById,
    getShiftRequestById: shift.getShiftRequestById,
    getShiftScheduleAssignmentById: shift.getShiftScheduleAssignmentById,
    getShiftScheduleById: shift.getShiftScheduleById,
    getShiftTypeById: shift.getShiftTypeById,
    listShiftAssignments: shift.listShiftAssignments,
    listShiftLocations: shift.listShiftLocations,
    listShiftRequests: shift.listShiftRequests,
    listShiftScheduleAssignments: shift.listShiftScheduleAssignments,
    listShiftSchedules: shift.listShiftSchedules,
    listShiftTypes: shift.listShiftTypes,
    rejectShiftRequest: shift.rejectShiftRequest,
    updateShiftAssignment: shift.updateShiftAssignment,
    updateShiftLocation: shift.updateShiftLocation,
    updateShiftRequest: shift.updateShiftRequest,
    updateShiftSchedule: shift.updateShiftSchedule,
    updateShiftScheduleAssignment: shift.updateShiftScheduleAssignment,
    updateShiftType: shift.updateShiftType,
  };
}

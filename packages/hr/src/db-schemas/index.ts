import {
  hrPermission,
  hrRole,
  hrRolePermission,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
} from "./access";
import { attendance, attendanceRequest, compensatoryLeaveRequest } from "./attendance";
import {
  employee,
  employeeCheckin,
  employeeGroup,
  employeeGroupMember,
  employeeHealthInsurance,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeTransfer,
} from "./employee";
import {
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
} from "./leave";
import { exitInterview, fullAndFinalStatement, onboardingTask, separationTask } from "./lifecycle";
import { overtimeSlip, overtimeType } from "./overtime";
import {
  department,
  designation,
  employeeGrade,
  employmentType,
  holiday,
  holidayList,
  hrSettings,
  payrollSettings,
} from "./setup";
import {
  shiftAssignment,
  shiftLocation,
  shiftRequest,
  shiftSchedule,
  shiftScheduleAssignment,
  shiftType,
} from "./shift";

export {
  hrPermission,
  hrRole,
  hrRolePermission,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
} from "./access";
export { attendance, attendanceRequest, compensatoryLeaveRequest } from "./attendance";
export {
  employee,
  employeeCheckin,
  employeeGroup,
  employeeGroupMember,
  employeeHealthInsurance,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeTransfer,
} from "./employee";
export * from "./enums";
export {
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
} from "./leave";
export { exitInterview, fullAndFinalStatement, onboardingTask, separationTask } from "./lifecycle";
export { overtimeSlip, overtimeType } from "./overtime";
export {
  department,
  designation,
  employeeGrade,
  employmentType,
  holiday,
  holidayList,
  hrSettings,
  payrollSettings,
} from "./setup";
export {
  shiftAssignment,
  shiftLocation,
  shiftRequest,
  shiftSchedule,
  shiftScheduleAssignment,
  shiftType,
} from "./shift";

export type HrUser = typeof hrUser.$inferSelect;
export type HrRole = typeof hrRole.$inferSelect;
export type HrPermission = typeof hrPermission.$inferSelect;
export type HrRolePermission = typeof hrRolePermission.$inferSelect;
export type HrUserRole = typeof hrUserRole.$inferSelect;
export type HrUserBranchAccess = typeof hrUserBranchAccess.$inferSelect;

export type NewHrUser = typeof hrUser.$inferInsert;
export type NewHrRole = typeof hrRole.$inferInsert;
export type NewHrPermission = typeof hrPermission.$inferInsert;
export type NewHrRolePermission = typeof hrRolePermission.$inferInsert;
export type NewHrUserRole = typeof hrUserRole.$inferInsert;
export type NewHrUserBranchAccess = typeof hrUserBranchAccess.$inferInsert;

export const dbSchema = {
  attendance,
  attendanceRequest,
  compensatoryLeaveRequest,
  department,
  designation,
  employee,
  employeeCheckin,
  employeeGrade,
  employeeGroup,
  employeeGroupMember,
  employeeHealthInsurance,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeTransfer,
  employmentType,
  exitInterview,
  fullAndFinalStatement,
  holiday,
  holidayList,
  hrPermission,
  hrRole,
  hrRolePermission,
  hrSettings,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
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
  onboardingTask,
  overtimeSlip,
  overtimeType,
  payrollSettings,
  separationTask,
  shiftAssignment,
  shiftLocation,
  shiftRequest,
  shiftSchedule,
  shiftScheduleAssignment,
  shiftType,
} as const;

export const hrTables = dbSchema;

export const control_plane_schemas = {
  department,
  designation,
  employeeGrade,
  employmentType,
  holiday,
  holidayList,
  hrPermission,
  hrRole,
  hrRolePermission,
  hrSettings,
  hrUser,
  hrUserBranchAccess,
  hrUserRole,
  payrollSettings,
} as const;

export const tenant_schemas = {
  attendance,
  attendanceRequest,
  compensatoryLeaveRequest,
  employee,
  employeeCheckin,
  employeeGroup,
  employeeGroupMember,
  employeeHealthInsurance,
  employeeOnboarding,
  employeePromotion,
  employeeSeparation,
  employeeSkillMap,
  employeeTransfer,
  exitInterview,
  fullAndFinalStatement,
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
  onboardingTask,
  overtimeSlip,
  overtimeType,
  separationTask,
  shiftAssignment,
  shiftLocation,
  shiftRequest,
  shiftSchedule,
  shiftScheduleAssignment,
  shiftType,
} as const;

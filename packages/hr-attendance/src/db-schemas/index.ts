import { attendance, attendanceRequest, employeeCheckin } from "#/db-schemas/attendance";
import {
  attendanceRequestStatusEnum,
  attendanceStatusEnum,
  checkinLogTypeEnum,
  overtimeStatusEnum,
  shiftAssignmentStatusEnum,
  shiftRequestStatusEnum,
} from "#/db-schemas/enums";
import { overtimeSlip, overtimeType } from "#/db-schemas/overtime";
import {
  shiftAssignment,
  shiftLocation,
  shiftRequest,
  shiftSchedule,
  shiftScheduleAssignment,
  shiftType,
} from "#/db-schemas/shift";

export { attendance, attendanceRequest, employeeCheckin } from "#/db-schemas/attendance";
export * from "#/db-schemas/enums";
export { overtimeSlip, overtimeType } from "#/db-schemas/overtime";
export {
  shiftAssignment,
  shiftLocation,
  shiftRequest,
  shiftSchedule,
  shiftScheduleAssignment,
  shiftType,
} from "#/db-schemas/shift";

export const dbSchema = {
  attendance,
  attendanceRequest,
  attendanceRequestStatusEnum,
  attendanceStatusEnum,
  checkinLogTypeEnum,
  employeeCheckin,
  overtimeSlip,
  overtimeStatusEnum,
  overtimeType,
  shiftAssignment,
  shiftAssignmentStatusEnum,
  shiftLocation,
  shiftRequest,
  shiftRequestStatusEnum,
  shiftSchedule,
  shiftScheduleAssignment,
  shiftType,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = {
  attendance,
  attendanceRequest,
  attendanceRequestStatusEnum,
  attendanceStatusEnum,
  checkinLogTypeEnum,
  employeeCheckin,
  overtimeSlip,
  overtimeStatusEnum,
  overtimeType,
  shiftAssignment,
  shiftAssignmentStatusEnum,
  shiftLocation,
  shiftRequest,
  shiftRequestStatusEnum,
  shiftSchedule,
  shiftScheduleAssignment,
  shiftType,
} as const;

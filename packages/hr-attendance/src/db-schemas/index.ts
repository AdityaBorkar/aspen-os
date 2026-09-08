import { attendance, attendanceRequest, employeeCheckin } from "#/db-schemas/attendance";
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
  employeeCheckin,
  overtimeSlip,
  overtimeType,
  shiftAssignment,
  shiftLocation,
  shiftRequest,
  shiftSchedule,
  shiftScheduleAssignment,
  shiftType,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = {
  attendance,
  attendanceRequest,
  employeeCheckin,
  overtimeSlip,
  overtimeType,
  shiftAssignment,
  shiftLocation,
  shiftRequest,
  shiftSchedule,
  shiftScheduleAssignment,
  shiftType,
} as const;

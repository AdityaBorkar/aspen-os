import { getById } from "#/workflows/attendance/by-id/get";
import { getCheckinById } from "#/workflows/attendance/checkin/by-id/get";
import { createCheckin } from "#/workflows/attendance/checkin/create";
import { deleteCheckin } from "#/workflows/attendance/checkin/delete";
import { listCheckins } from "#/workflows/attendance/checkins/list";
import { create } from "#/workflows/attendance/create";
import { deleteRecord } from "#/workflows/attendance/delete";
import { list } from "#/workflows/attendance/list";
import { approveAttendanceRequest } from "#/workflows/attendance/request/approve";
import { getAttendanceRequestById } from "#/workflows/attendance/request/by-id/get";
import { createAttendanceRequest } from "#/workflows/attendance/request/create";
import { deleteAttendanceRequest } from "#/workflows/attendance/request/delete";
import { rejectAttendanceRequest } from "#/workflows/attendance/request/reject";
import { updateAttendanceRequest } from "#/workflows/attendance/request/update";
import { listAttendanceRequests } from "#/workflows/attendance/requests/list";
import { getSummary } from "#/workflows/attendance/summary/get";
import { update } from "#/workflows/attendance/update";
import { approveOvertimeSlip } from "#/workflows/overtime/slip/approve";
import { getOvertimeSlipById } from "#/workflows/overtime/slip/by-id/get";
import { createOvertimeSlip } from "#/workflows/overtime/slip/create";
import { deleteOvertimeSlip } from "#/workflows/overtime/slip/delete";
import { rejectOvertimeSlip } from "#/workflows/overtime/slip/reject";
import { updateOvertimeSlip } from "#/workflows/overtime/slip/update";
import { listOvertimeSlips } from "#/workflows/overtime/slips/list";
import { getOvertimeSummary } from "#/workflows/overtime/summary/get";
import { getOvertimeTypeById } from "#/workflows/overtime/type/by-id/get";
import { createOvertimeType } from "#/workflows/overtime/type/create";
import { deleteOvertimeType } from "#/workflows/overtime/type/delete";
import { updateOvertimeType } from "#/workflows/overtime/type/update";
import { listOvertimeTypes } from "#/workflows/overtime/types/list";
import { getShiftAssignmentById } from "#/workflows/shift/assignment/by-id/get";
import { createShiftAssignment } from "#/workflows/shift/assignment/create";
import { deactivateShiftAssignment } from "#/workflows/shift/assignment/deactivate";
import { deleteShiftAssignment } from "#/workflows/shift/assignment/delete";
import { updateShiftAssignment } from "#/workflows/shift/assignment/update";
import { listShiftAssignments } from "#/workflows/shift/assignments/list";
import { getShiftLocationById } from "#/workflows/shift/location/by-id/get";
import { createShiftLocation } from "#/workflows/shift/location/create";
import { deleteShiftLocation } from "#/workflows/shift/location/delete";
import { updateShiftLocation } from "#/workflows/shift/location/update";
import { listShiftLocations } from "#/workflows/shift/locations/list";
import { approveShiftRequest } from "#/workflows/shift/request/approve";
import { getShiftRequestById } from "#/workflows/shift/request/by-id/get";
import { createShiftRequest } from "#/workflows/shift/request/create";
import { deleteShiftRequest } from "#/workflows/shift/request/delete";
import { rejectShiftRequest } from "#/workflows/shift/request/reject";
import { updateShiftRequest } from "#/workflows/shift/request/update";
import { listShiftRequests } from "#/workflows/shift/requests/list";
import { getShiftScheduleAssignmentById } from "#/workflows/shift/schedule-assignment/by-id/get";
import { createShiftScheduleAssignment } from "#/workflows/shift/schedule-assignment/create";
import { deleteShiftScheduleAssignment } from "#/workflows/shift/schedule-assignment/delete";
import { updateShiftScheduleAssignment } from "#/workflows/shift/schedule-assignment/update";
import { listShiftScheduleAssignments } from "#/workflows/shift/schedule-assignments/list";
import { getShiftScheduleById } from "#/workflows/shift/schedule/by-id/get";
import { createShiftSchedule } from "#/workflows/shift/schedule/create";
import { deleteShiftSchedule } from "#/workflows/shift/schedule/delete";
import { updateShiftSchedule } from "#/workflows/shift/schedule/update";
import { listShiftSchedules } from "#/workflows/shift/schedules/list";
import { getShiftTypeById } from "#/workflows/shift/type/by-id/get";
import { createShiftType } from "#/workflows/shift/type/create";
import { deleteShiftType } from "#/workflows/shift/type/delete";
import { updateShiftType } from "#/workflows/shift/type/update";
import { listShiftTypes } from "#/workflows/shift/types/list";

export const attendance = {
  approveAttendanceRequest,
  create,
  createAttendanceRequest,
  createCheckin,
  deleteAttendanceRequest,
  deleteCheckin,
  deleteRecord,
  getAttendanceRequestById,
  getById,
  getCheckinById,
  getSummary,
  list,
  listAttendanceRequests,
  listCheckins,
  rejectAttendanceRequest,
  update,
  updateAttendanceRequest,
} as const;

export const overtime = {
  approveOvertimeSlip,
  createOvertimeSlip,
  createOvertimeType,
  deleteOvertimeSlip,
  deleteOvertimeType,
  getOvertimeSlipById,
  getOvertimeSummary,
  getOvertimeTypeById,
  listOvertimeSlips,
  listOvertimeTypes,
  rejectOvertimeSlip,
  updateOvertimeSlip,
  updateOvertimeType,
} as const;

export const shift = {
  approveShiftRequest,
  createShiftAssignment,
  createShiftLocation,
  createShiftRequest,
  createShiftSchedule,
  createShiftScheduleAssignment,
  createShiftType,
  deactivateShiftAssignment,
  deleteShiftAssignment,
  deleteShiftLocation,
  deleteShiftRequest,
  deleteShiftSchedule,
  deleteShiftScheduleAssignment,
  deleteShiftType,
  getShiftAssignmentById,
  getShiftLocationById,
  getShiftRequestById,
  getShiftScheduleAssignmentById,
  getShiftScheduleById,
  getShiftTypeById,
  listShiftAssignments,
  listShiftLocations,
  listShiftRequests,
  listShiftScheduleAssignments,
  listShiftSchedules,
  listShiftTypes,
  rejectShiftRequest,
  updateShiftAssignment,
  updateShiftLocation,
  updateShiftRequest,
  updateShiftSchedule,
  updateShiftScheduleAssignment,
  updateShiftType,
} as const;

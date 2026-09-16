import { createCheckin } from "#/workflows/attendance/checkin/create";
import { deleteCheckin } from "#/workflows/attendance/checkin/delete";
import { getCheckin } from "#/workflows/attendance/checkin/get";
import { listCheckins } from "#/workflows/attendance/checkin/list";
import { createAttendance } from "#/workflows/attendance/create";
import { deleteAttendance } from "#/workflows/attendance/delete";
import { getAttendance } from "#/workflows/attendance/get";
import { listAttendances } from "#/workflows/attendance/list";
import { approveAttendanceRequest } from "#/workflows/attendance/request/approve";
import { createAttendanceRequest } from "#/workflows/attendance/request/create";
import { deleteAttendanceRequest } from "#/workflows/attendance/request/delete";
import { getAttendanceRequest } from "#/workflows/attendance/request/get";
import { listAttendanceRequests } from "#/workflows/attendance/request/list";
import { rejectAttendanceRequest } from "#/workflows/attendance/request/reject";
import { updateAttendanceRequest } from "#/workflows/attendance/request/update";
import { getAttendanceSummary } from "#/workflows/attendance/summary/get";
import { updateAttendance } from "#/workflows/attendance/update";
import { approveOvertimeSlip } from "#/workflows/overtime/slip/approve";
import { createOvertimeSlip } from "#/workflows/overtime/slip/create";
import { deleteOvertimeSlip } from "#/workflows/overtime/slip/delete";
import { getOvertimeSlip } from "#/workflows/overtime/slip/get";
import { listOvertimeSlips } from "#/workflows/overtime/slip/list";
import { rejectOvertimeSlip } from "#/workflows/overtime/slip/reject";
import { updateOvertimeSlip } from "#/workflows/overtime/slip/update";
import { getOvertimeSummary } from "#/workflows/overtime/summary/get";
import { createOvertimeType } from "#/workflows/overtime/type/create";
import { deleteOvertimeType } from "#/workflows/overtime/type/delete";
import { getOvertimeType } from "#/workflows/overtime/type/get";
import { listOvertimeTypes } from "#/workflows/overtime/type/list";
import { updateOvertimeType } from "#/workflows/overtime/type/update";
import { createShiftAssignment } from "#/workflows/shift/assignment/create";
import { deactivateShiftAssignment } from "#/workflows/shift/assignment/deactivate";
import { deleteShiftAssignment } from "#/workflows/shift/assignment/delete";
import { getShiftAssignment } from "#/workflows/shift/assignment/get";
import { listShiftAssignments } from "#/workflows/shift/assignment/list";
import { updateShiftAssignment } from "#/workflows/shift/assignment/update";
import { createShiftLocation } from "#/workflows/shift/location/create";
import { deleteShiftLocation } from "#/workflows/shift/location/delete";
import { getShiftLocation } from "#/workflows/shift/location/get";
import { listShiftLocations } from "#/workflows/shift/location/list";
import { updateShiftLocation } from "#/workflows/shift/location/update";
import { approveShiftRequest } from "#/workflows/shift/request/approve";
import { createShiftRequest } from "#/workflows/shift/request/create";
import { deleteShiftRequest } from "#/workflows/shift/request/delete";
import { getShiftRequest } from "#/workflows/shift/request/get";
import { listShiftRequests } from "#/workflows/shift/request/list";
import { rejectShiftRequest } from "#/workflows/shift/request/reject";
import { updateShiftRequest } from "#/workflows/shift/request/update";
import { createShiftScheduleAssignment } from "#/workflows/shift/schedule-assignment/create";
import { deleteShiftScheduleAssignment } from "#/workflows/shift/schedule-assignment/delete";
import { getShiftScheduleAssignment } from "#/workflows/shift/schedule-assignment/get";
import { listShiftScheduleAssignments } from "#/workflows/shift/schedule-assignment/list";
import { updateShiftScheduleAssignment } from "#/workflows/shift/schedule-assignment/update";
import { createShiftSchedule } from "#/workflows/shift/schedule/create";
import { deleteShiftSchedule } from "#/workflows/shift/schedule/delete";
import { getShiftSchedule } from "#/workflows/shift/schedule/get";
import { listShiftSchedules } from "#/workflows/shift/schedule/list";
import { updateShiftSchedule } from "#/workflows/shift/schedule/update";
import { createShiftType } from "#/workflows/shift/type/create";
import { deleteShiftType } from "#/workflows/shift/type/delete";
import { getShiftType } from "#/workflows/shift/type/get";
import { listShiftTypes } from "#/workflows/shift/type/list";
import { updateShiftType } from "#/workflows/shift/type/update";

export const attendance = {
  checkins: {
    create: createCheckin,
    delete: deleteCheckin,
    get: getCheckin,
    list: listCheckins,
  },
  create: createAttendance,
  delete: deleteAttendance,
  get: getAttendance,
  list: listAttendances,
  requests: {
    approve: approveAttendanceRequest,
    create: createAttendanceRequest,
    delete: deleteAttendanceRequest,
    get: getAttendanceRequest,
    list: listAttendanceRequests,
    reject: rejectAttendanceRequest,
    update: updateAttendanceRequest,
  },
  summary: {
    get: getAttendanceSummary,
  },
  update: updateAttendance,
} as const;

export const overtime = {
  slips: {
    approve: approveOvertimeSlip,
    create: createOvertimeSlip,
    delete: deleteOvertimeSlip,
    get: getOvertimeSlip,
    list: listOvertimeSlips,
    reject: rejectOvertimeSlip,
    update: updateOvertimeSlip,
  },
  summary: {
    get: getOvertimeSummary,
  },
  types: {
    create: createOvertimeType,
    delete: deleteOvertimeType,
    get: getOvertimeType,
    list: listOvertimeTypes,
    update: updateOvertimeType,
  },
} as const;

export const shift = {
  assignments: {
    create: createShiftAssignment,
    deactivate: deactivateShiftAssignment,
    delete: deleteShiftAssignment,
    get: getShiftAssignment,
    list: listShiftAssignments,
    update: updateShiftAssignment,
  },
  locations: {
    create: createShiftLocation,
    delete: deleteShiftLocation,
    get: getShiftLocation,
    list: listShiftLocations,
    update: updateShiftLocation,
  },
  requests: {
    approve: approveShiftRequest,
    create: createShiftRequest,
    delete: deleteShiftRequest,
    get: getShiftRequest,
    list: listShiftRequests,
    reject: rejectShiftRequest,
    update: updateShiftRequest,
  },
  scheduleAssignments: {
    create: createShiftScheduleAssignment,
    delete: deleteShiftScheduleAssignment,
    get: getShiftScheduleAssignment,
    list: listShiftScheduleAssignments,
    update: updateShiftScheduleAssignment,
  },
  schedules: {
    create: createShiftSchedule,
    delete: deleteShiftSchedule,
    get: getShiftSchedule,
    list: listShiftSchedules,
    update: updateShiftSchedule,
  },
  types: {
    create: createShiftType,
    delete: deleteShiftType,
    get: getShiftType,
    list: listShiftTypes,
    update: updateShiftType,
  },
} as const;

// ─── Attendance Events ───────────────────────────────────────────────────

export const ATTENDANCE_EVENTS = {
  CHECKIN_CREATED: "attendance:checkin_created",
  CREATED: "attendance:created",
  REQUEST_APPROVED: "attendance:request_approved",
  REQUEST_CREATED: "attendance:request_created",
  REQUEST_REJECTED: "attendance:request_rejected",
} as const;

export interface AttendanceCreatedEvent {
  attendance: {
    date: string;
    employeeId: string;
    id: string;
    status: string;
  };
}

export interface AttendanceCheckinCreatedEvent {
  checkin: {
    employeeId: string;
    id: string;
    logType: string;
    time: string;
  };
}

export interface AttendanceRequestCreatedEvent {
  request: {
    employeeId: string;
    fromDate: string;
    id: string;
  };
}

export interface AttendanceRequestApprovedEvent {
  approvedBy: string;
  requestId: string;
}

export interface AttendanceRequestRejectedEvent {
  rejectedBy: string;
  requestId: string;
}

// ─── Overtime Events ──────────────────────────────────────────────────────

export const OVERTIME_EVENTS = {
  SLIP_APPROVED: "overtime:slip_approved",
  SLIP_CREATED: "overtime:slip_created",
  SLIP_REJECTED: "overtime:slip_rejected",
} as const;

export interface OvertimeSlipCreatedEvent {
  slip: {
    employeeId: string;
    fromDate: string;
    id: string;
    overtimeType: string;
    toDate: string;
  };
}

export interface OvertimeSlipApprovedEvent {
  approvedBy: string;
  slipId: string;
}

export interface OvertimeSlipRejectedEvent {
  rejectedBy: string;
  slipId: string;
}

// ─── Shift Events ─────────────────────────────────────────────────────────

export const SHIFT_EVENTS = {
  ASSIGNMENT_CREATED: "shift:assignment_created",
  REQUEST_APPROVED: "shift:request_approved",
  REQUEST_CREATED: "shift:request_created",
  REQUEST_REJECTED: "shift:request_rejected",
} as const;

export interface ShiftAssignmentCreatedEvent {
  assignment: {
    employeeId: string;
    id: string;
    shiftType: string;
    startDate: string;
  };
}

export interface ShiftRequestCreatedEvent {
  request: {
    employeeId: string;
    fromDate: string;
    id: string;
    shiftType: string;
  };
}

export interface ShiftRequestApprovedEvent {
  approvedBy: string;
  requestId: string;
}

export interface ShiftRequestRejectedEvent {
  rejectedBy: string;
  requestId: string;
}

// ─── Event Maps ───────────────────────────────────────────────────────────

export interface AttendanceEventMap {
  [ATTENDANCE_EVENTS.CHECKIN_CREATED]: AttendanceCheckinCreatedEvent;
  [ATTENDANCE_EVENTS.CREATED]: AttendanceCreatedEvent;
  [ATTENDANCE_EVENTS.REQUEST_APPROVED]: AttendanceRequestApprovedEvent;
  [ATTENDANCE_EVENTS.REQUEST_CREATED]: AttendanceRequestCreatedEvent;
  [ATTENDANCE_EVENTS.REQUEST_REJECTED]: AttendanceRequestRejectedEvent;
}

export interface OvertimeEventMap {
  [OVERTIME_EVENTS.SLIP_APPROVED]: OvertimeSlipApprovedEvent;
  [OVERTIME_EVENTS.SLIP_CREATED]: OvertimeSlipCreatedEvent;
  [OVERTIME_EVENTS.SLIP_REJECTED]: OvertimeSlipRejectedEvent;
}

export interface ShiftEventMap {
  [SHIFT_EVENTS.ASSIGNMENT_CREATED]: ShiftAssignmentCreatedEvent;
  [SHIFT_EVENTS.REQUEST_APPROVED]: ShiftRequestApprovedEvent;
  [SHIFT_EVENTS.REQUEST_CREATED]: ShiftRequestCreatedEvent;
  [SHIFT_EVENTS.REQUEST_REJECTED]: ShiftRequestRejectedEvent;
}

export type HrAttendanceEventMap = AttendanceEventMap & OvertimeEventMap & ShiftEventMap;

export const events = {
  attendance: ATTENDANCE_EVENTS,
  overtime: OVERTIME_EVENTS,
  shift: SHIFT_EVENTS,
};

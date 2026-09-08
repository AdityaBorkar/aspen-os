// ─── Leave Events ─────────────────────────────────────────────────────────

export const LEAVE_EVENTS = {
  ALLOCATION_CREATED: "leave:allocation_created",
  APPLICATION_APPROVED: "leave:application_approved",
  APPLICATION_CANCELLED: "leave:application_cancelled",
  APPLICATION_REJECTED: "leave:application_rejected",
  APPLICATION_SUBMITTED: "leave:application_submitted",
  ENCASHMENT_REQUESTED: "leave:encashment_requested",
} as const;

export interface LeaveApplicationSubmittedEvent {
  application: {
    employeeId: string;
    fromDate: string;
    id: string;
    leaveType: string;
    toDate: string;
    totalDays: string;
  };
}

export interface LeaveApplicationApprovedEvent {
  applicationId: string;
  approvedBy: string;
}

export interface LeaveApplicationRejectedEvent {
  applicationId: string;
  rejectedBy: string;
}

export interface LeaveApplicationCancelledEvent {
  applicationId: string;
}

export interface LeaveAllocationCreatedEvent {
  allocation: {
    employeeId: string;
    id: string;
    leaveType: string;
    totalDays: string;
  };
}

export interface LeaveEncashmentRequestedEvent {
  encashment: {
    employeeId: string;
    encashableDays: string;
    id: string;
    leaveType: string;
  };
}

// ─── Event Maps ───────────────────────────────────────────────────────────

export interface LeaveEventMap {
  [LEAVE_EVENTS.ALLOCATION_CREATED]: LeaveAllocationCreatedEvent;
  [LEAVE_EVENTS.APPLICATION_APPROVED]: LeaveApplicationApprovedEvent;
  [LEAVE_EVENTS.APPLICATION_CANCELLED]: LeaveApplicationCancelledEvent;
  [LEAVE_EVENTS.APPLICATION_REJECTED]: LeaveApplicationRejectedEvent;
  [LEAVE_EVENTS.APPLICATION_SUBMITTED]: LeaveApplicationSubmittedEvent;
  [LEAVE_EVENTS.ENCASHMENT_REQUESTED]: LeaveEncashmentRequestedEvent;
}

export type HrLeaveEventMap = LeaveEventMap;

export const events = {
  leave: LEAVE_EVENTS,
};

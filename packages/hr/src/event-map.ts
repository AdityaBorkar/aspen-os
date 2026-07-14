// ─── Employee Events ──────────────────────────────────────────────────────

export const EMPLOYEE_EVENTS = {
  CREATED: "employee:created",
  GROUP_CREATED: "employee:group_created",
  STATUS_CHANGED: "employee:status_changed",
  UPDATED: "employee:updated",
} as const;

export interface EmployeeCreatedEvent {
  employee: {
    employeeId: string;
    firstName: string;
    id: string;
    lastName: string;
  };
}

export interface EmployeeUpdatedEvent {
  changes: Record<string, unknown>;
  employee: { id: string; name: string };
}

export interface EmployeeStatusChangedEvent {
  employeeId: string;
  fromStatus: string;
  toStatus: string;
}

export interface EmployeeGroupCreatedEvent {
  group: { id: string; name: string };
}

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

// ─── Lifecycle Events ─────────────────────────────────────────────────────

export const LIFECYCLE_EVENTS = {
  EXIT_INTERVIEW_SCHEDULED: "lifecycle:exit_interview_scheduled",
  ONBOARDING_COMPLETED: "lifecycle:onboarding_completed",
  ONBOARDING_STARTED: "lifecycle:onboarding_started",
  PROMOTION_APPROVED: "lifecycle:promotion_approved",
  PROMOTION_REQUESTED: "lifecycle:promotion_requested",
  SEPARATION_COMPLETED: "lifecycle:separation_completed",
  SEPARATION_INITIATED: "lifecycle:separation_initiated",
  TRANSFER_APPROVED: "lifecycle:transfer_approved",
  TRANSFER_REQUESTED: "lifecycle:transfer_requested",
} as const;

export interface OnboardingStartedEvent {
  onboarding: {
    employeeId: string;
    id: string;
    startDate: string;
  };
}

export interface OnboardingCompletedEvent {
  employeeId: string;
  onboardingId: string;
}

export interface PromotionRequestedEvent {
  promotion: {
    currentDesignation: string;
    employeeId: string;
    id: string;
    newDesignation: string;
  };
}

export interface PromotionApprovedEvent {
  approvedBy: string;
  employeeId: string;
  promotionId: string;
}

export interface TransferRequestedEvent {
  transfer: {
    employeeId: string;
    fromDepartment: string | null;
    id: string;
    toDepartment: string | null;
  };
}

export interface TransferApprovedEvent {
  approvedBy: string;
  employeeId: string;
  transferId: string;
}

export interface SeparationInitiatedEvent {
  separation: {
    employeeId: string;
    exitDate: string;
    id: string;
  };
}

export interface SeparationCompletedEvent {
  employeeId: string;
  separationId: string;
}

export interface ExitInterviewScheduledEvent {
  employeeId: string;
  exitInterviewId: string;
  scheduledDate: string;
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

// ─── Setup Events ─────────────────────────────────────────────────────────

export const SETUP_EVENTS = {
  DEPARTMENT_CREATED: "setup:department_created",
  DESIGNATION_CREATED: "setup:designation_created",
  HOLIDAY_LIST_CREATED: "setup:holiday_list_created",
  SETTINGS_UPDATED: "setup:settings_updated",
} as const;

export interface DepartmentCreatedEvent {
  department: { code: string; id: string; name: string };
}

export interface DesignationCreatedEvent {
  designation: { id: string; name: string };
}

export interface HolidayListCreatedEvent {
  holidayList: { id: string; name: string; year: number };
}

export interface HrSettingsUpdatedEvent {
  changes: Record<string, unknown>;
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

// ─── Access Events ────────────────────────────────────────────────────────

export const ACCESS_EVENTS = {
  BRANCH_ACCESS_GRANTED: "access:branch_access_granted",
  BRANCH_ACCESS_REVOKED: "access:branch_access_revoked",
  ROLE_ASSIGNED: "access:role_assigned",
  ROLE_CREATED: "access:role_created",
  ROLE_REVOKED: "access:role_revoked",
  USER_ACTIVATED: "access:user_activated",
  USER_CREATED: "access:user_created",
  USER_DEACTIVATED: "access:user_deactivated",
} as const;

export interface AccessUserCreatedEvent {
  user: {
    employeeId: string;
    id: string;
    userId: string;
  };
}

export interface AccessUserActivatedEvent {
  hrUserId: string;
}

export interface AccessUserDeactivatedEvent {
  hrUserId: string;
}

export interface AccessRoleCreatedEvent {
  role: { id: string; isSystem: boolean; name: string };
}

export interface AccessRoleAssignedEvent {
  assignment: {
    branchId: string | null;
    hrUserId: string;
    roleId: string;
  };
}

export interface AccessRoleRevokedEvent {
  branchId: string | null;
  hrUserId: string;
  roleId: string;
}

export interface AccessBranchAccessGrantedEvent {
  access: {
    accessLevel: string;
    branchId: string;
    hrUserId: string;
  };
}

export interface AccessBranchAccessRevokedEvent {
  branchId: string;
  hrUserId: string;
}

// ─── Event Maps ───────────────────────────────────────────────────────────

export type EmployeeEventMap = {
  [EMPLOYEE_EVENTS.CREATED]: EmployeeCreatedEvent;
  [EMPLOYEE_EVENTS.GROUP_CREATED]: EmployeeGroupCreatedEvent;
  [EMPLOYEE_EVENTS.STATUS_CHANGED]: EmployeeStatusChangedEvent;
  [EMPLOYEE_EVENTS.UPDATED]: EmployeeUpdatedEvent;
};

export type AttendanceEventMap = {
  [ATTENDANCE_EVENTS.CHECKIN_CREATED]: AttendanceCheckinCreatedEvent;
  [ATTENDANCE_EVENTS.CREATED]: AttendanceCreatedEvent;
  [ATTENDANCE_EVENTS.REQUEST_APPROVED]: AttendanceRequestApprovedEvent;
  [ATTENDANCE_EVENTS.REQUEST_CREATED]: AttendanceRequestCreatedEvent;
  [ATTENDANCE_EVENTS.REQUEST_REJECTED]: AttendanceRequestRejectedEvent;
};

export type LeaveEventMap = {
  [LEAVE_EVENTS.ALLOCATION_CREATED]: LeaveAllocationCreatedEvent;
  [LEAVE_EVENTS.APPLICATION_APPROVED]: LeaveApplicationApprovedEvent;
  [LEAVE_EVENTS.APPLICATION_CANCELLED]: LeaveApplicationCancelledEvent;
  [LEAVE_EVENTS.APPLICATION_REJECTED]: LeaveApplicationRejectedEvent;
  [LEAVE_EVENTS.APPLICATION_SUBMITTED]: LeaveApplicationSubmittedEvent;
  [LEAVE_EVENTS.ENCASHMENT_REQUESTED]: LeaveEncashmentRequestedEvent;
};

export type LifecycleEventMap = {
  [LIFECYCLE_EVENTS.EXIT_INTERVIEW_SCHEDULED]: ExitInterviewScheduledEvent;
  [LIFECYCLE_EVENTS.ONBOARDING_COMPLETED]: OnboardingCompletedEvent;
  [LIFECYCLE_EVENTS.ONBOARDING_STARTED]: OnboardingStartedEvent;
  [LIFECYCLE_EVENTS.PROMOTION_APPROVED]: PromotionApprovedEvent;
  [LIFECYCLE_EVENTS.PROMOTION_REQUESTED]: PromotionRequestedEvent;
  [LIFECYCLE_EVENTS.SEPARATION_COMPLETED]: SeparationCompletedEvent;
  [LIFECYCLE_EVENTS.SEPARATION_INITIATED]: SeparationInitiatedEvent;
  [LIFECYCLE_EVENTS.TRANSFER_APPROVED]: TransferApprovedEvent;
  [LIFECYCLE_EVENTS.TRANSFER_REQUESTED]: TransferRequestedEvent;
};

export type OvertimeEventMap = {
  [OVERTIME_EVENTS.SLIP_APPROVED]: OvertimeSlipApprovedEvent;
  [OVERTIME_EVENTS.SLIP_CREATED]: OvertimeSlipCreatedEvent;
  [OVERTIME_EVENTS.SLIP_REJECTED]: OvertimeSlipRejectedEvent;
};

export type SetupEventMap = {
  [SETUP_EVENTS.DEPARTMENT_CREATED]: DepartmentCreatedEvent;
  [SETUP_EVENTS.DESIGNATION_CREATED]: DesignationCreatedEvent;
  [SETUP_EVENTS.HOLIDAY_LIST_CREATED]: HolidayListCreatedEvent;
  [SETUP_EVENTS.SETTINGS_UPDATED]: HrSettingsUpdatedEvent;
};

export type ShiftEventMap = {
  [SHIFT_EVENTS.ASSIGNMENT_CREATED]: ShiftAssignmentCreatedEvent;
  [SHIFT_EVENTS.REQUEST_APPROVED]: ShiftRequestApprovedEvent;
  [SHIFT_EVENTS.REQUEST_CREATED]: ShiftRequestCreatedEvent;
  [SHIFT_EVENTS.REQUEST_REJECTED]: ShiftRequestRejectedEvent;
};

export type AccessEventMap = {
  [ACCESS_EVENTS.BRANCH_ACCESS_GRANTED]: AccessBranchAccessGrantedEvent;
  [ACCESS_EVENTS.BRANCH_ACCESS_REVOKED]: AccessBranchAccessRevokedEvent;
  [ACCESS_EVENTS.ROLE_ASSIGNED]: AccessRoleAssignedEvent;
  [ACCESS_EVENTS.ROLE_CREATED]: AccessRoleCreatedEvent;
  [ACCESS_EVENTS.ROLE_REVOKED]: AccessRoleRevokedEvent;
  [ACCESS_EVENTS.USER_ACTIVATED]: AccessUserActivatedEvent;
  [ACCESS_EVENTS.USER_CREATED]: AccessUserCreatedEvent;
  [ACCESS_EVENTS.USER_DEACTIVATED]: AccessUserDeactivatedEvent;
};

export type HrEventMap = EmployeeEventMap &
  AttendanceEventMap &
  LeaveEventMap &
  LifecycleEventMap &
  OvertimeEventMap &
  SetupEventMap &
  ShiftEventMap &
  AccessEventMap;

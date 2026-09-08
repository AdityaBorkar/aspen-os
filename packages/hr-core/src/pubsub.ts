import type { JsonValue } from "@aspen-os/platform/server";

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
  changes: Record<string, JsonValue>;
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

// ─── Position Events ────────────────────────────────────────────────────

export const POSITION_EVENTS = {
  ACTIVATED: "position:activated",
  ASSIGNED: "position:assigned",
  CREATED: "position:created",
  DEACTIVATED: "position:deactivated",
  REASSIGNED: "position:reassigned",
  UNASSIGNED: "position:unassigned",
  UPDATED: "position:updated",
} as const;

export interface PositionCreatedEvent {
  position: {
    department: string;
    id: string;
    name: string;
  };
}

export interface PositionUpdatedEvent {
  changes: Record<string, JsonValue>;
  position: { id: string };
}

export interface PositionDeactivatedEvent {
  positionId: string;
}

export interface PositionActivatedEvent {
  positionId: string;
}

export interface PositionAssignedEvent {
  assignment: {
    employeeId: string;
    fromDate: string;
    positionId: string;
  };
}

export interface PositionUnassignedEvent {
  employeeId: string;
  positionId: string;
  toDate: string;
}

export interface PositionReassignedEvent {
  employeeId: string;
  fromPositionId: string;
  toPositionId: string;
}

// ─── Setup Events ─────────────────────────────────────────────────────────

export const SETUP_EVENTS = {
  DEPARTMENT_CREATED: "setup:department_created",
  DEPARTMENT_HEAD_CHANGED: "setup:department_head_changed",
  DEPARTMENT_MOVED: "setup:department_moved",
  DESIGNATION_CREATED: "setup:designation_created",
  HOLIDAY_LIST_CREATED: "setup:holiday_list_created",
  SETTINGS_UPDATED: "setup:settings_updated",
} as const;

export interface DepartmentCreatedEvent {
  department: { code: string; id: string; name: string };
}

export interface DepartmentHeadChangedEvent {
  departmentId: string;
  headEmployeeId: string | null;
}

export interface DepartmentMovedEvent {
  departmentId: string;
  fromParentId: string | null;
  toParentId: string | null;
}

export interface DesignationCreatedEvent {
  designation: { id: string; name: string };
}

export interface HolidayListCreatedEvent {
  holidayList: { id: string; name: string; year: number };
}

export interface HrSettingsUpdatedEvent {
  changes: Record<string, JsonValue>;
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

// ─── Announcement Events ─────────────────────────────────────────────────

export const ANNOUNCEMENT_EVENTS = {
  ARCHIVED: "announcement:archived",
  CREATED: "announcement:created",
  PINNED: "announcement:pinned",
  PUBLISHED: "announcement:published",
  SCHEDULED: "announcement:scheduled",
  UPDATED: "announcement:updated",
} as const;

export interface AnnouncementCreatedEvent {
  announcement: {
    channel: string;
    id: string;
    status: string;
    title: string;
  };
}

export interface AnnouncementUpdatedEvent {
  announcement: { id: string };
  changes: Record<string, JsonValue>;
}

export interface AnnouncementScheduledEvent {
  announcementId: string;
  scheduledFor: string;
}

export interface AnnouncementPublishedEvent {
  announcement: { id: string; title: string };
  recipientUserIds: string[];
}

export interface AnnouncementArchivedEvent {
  announcementId: string;
}

export interface AnnouncementPinnedEvent {
  announcementId: string;
  isPinned: boolean;
  pinnedBy: string;
}

// ─── Event Maps ───────────────────────────────────────────────────────────

export interface EmployeeEventMap {
  [EMPLOYEE_EVENTS.CREATED]: EmployeeCreatedEvent;
  [EMPLOYEE_EVENTS.GROUP_CREATED]: EmployeeGroupCreatedEvent;
  [EMPLOYEE_EVENTS.STATUS_CHANGED]: EmployeeStatusChangedEvent;
  [EMPLOYEE_EVENTS.UPDATED]: EmployeeUpdatedEvent;
}

export interface LifecycleEventMap {
  [LIFECYCLE_EVENTS.EXIT_INTERVIEW_SCHEDULED]: ExitInterviewScheduledEvent;
  [LIFECYCLE_EVENTS.ONBOARDING_COMPLETED]: OnboardingCompletedEvent;
  [LIFECYCLE_EVENTS.ONBOARDING_STARTED]: OnboardingStartedEvent;
  [LIFECYCLE_EVENTS.PROMOTION_APPROVED]: PromotionApprovedEvent;
  [LIFECYCLE_EVENTS.PROMOTION_REQUESTED]: PromotionRequestedEvent;
  [LIFECYCLE_EVENTS.SEPARATION_COMPLETED]: SeparationCompletedEvent;
  [LIFECYCLE_EVENTS.SEPARATION_INITIATED]: SeparationInitiatedEvent;
  [LIFECYCLE_EVENTS.TRANSFER_APPROVED]: TransferApprovedEvent;
  [LIFECYCLE_EVENTS.TRANSFER_REQUESTED]: TransferRequestedEvent;
}

export interface PositionEventMap {
  [POSITION_EVENTS.ACTIVATED]: PositionActivatedEvent;
  [POSITION_EVENTS.ASSIGNED]: PositionAssignedEvent;
  [POSITION_EVENTS.CREATED]: PositionCreatedEvent;
  [POSITION_EVENTS.DEACTIVATED]: PositionDeactivatedEvent;
  [POSITION_EVENTS.REASSIGNED]: PositionReassignedEvent;
  [POSITION_EVENTS.UNASSIGNED]: PositionUnassignedEvent;
  [POSITION_EVENTS.UPDATED]: PositionUpdatedEvent;
}

export interface SetupEventMap {
  [SETUP_EVENTS.DEPARTMENT_CREATED]: DepartmentCreatedEvent;
  [SETUP_EVENTS.DEPARTMENT_HEAD_CHANGED]: DepartmentHeadChangedEvent;
  [SETUP_EVENTS.DEPARTMENT_MOVED]: DepartmentMovedEvent;
  [SETUP_EVENTS.DESIGNATION_CREATED]: DesignationCreatedEvent;
  [SETUP_EVENTS.HOLIDAY_LIST_CREATED]: HolidayListCreatedEvent;
  [SETUP_EVENTS.SETTINGS_UPDATED]: HrSettingsUpdatedEvent;
}

export interface AccessEventMap {
  [ACCESS_EVENTS.BRANCH_ACCESS_GRANTED]: AccessBranchAccessGrantedEvent;
  [ACCESS_EVENTS.BRANCH_ACCESS_REVOKED]: AccessBranchAccessRevokedEvent;
  [ACCESS_EVENTS.ROLE_ASSIGNED]: AccessRoleAssignedEvent;
  [ACCESS_EVENTS.ROLE_CREATED]: AccessRoleCreatedEvent;
  [ACCESS_EVENTS.ROLE_REVOKED]: AccessRoleRevokedEvent;
  [ACCESS_EVENTS.USER_ACTIVATED]: AccessUserActivatedEvent;
  [ACCESS_EVENTS.USER_CREATED]: AccessUserCreatedEvent;
  [ACCESS_EVENTS.USER_DEACTIVATED]: AccessUserDeactivatedEvent;
}

export interface AnnouncementEventMap {
  [ANNOUNCEMENT_EVENTS.ARCHIVED]: AnnouncementArchivedEvent;
  [ANNOUNCEMENT_EVENTS.CREATED]: AnnouncementCreatedEvent;
  [ANNOUNCEMENT_EVENTS.PINNED]: AnnouncementPinnedEvent;
  [ANNOUNCEMENT_EVENTS.PUBLISHED]: AnnouncementPublishedEvent;
  [ANNOUNCEMENT_EVENTS.SCHEDULED]: AnnouncementScheduledEvent;
  [ANNOUNCEMENT_EVENTS.UPDATED]: AnnouncementUpdatedEvent;
}

export type HrEventMap = EmployeeEventMap &
  LifecycleEventMap &
  PositionEventMap &
  SetupEventMap &
  AccessEventMap &
  AnnouncementEventMap;

export type HrCoreEventMap = HrEventMap;

export const events = {
  access: ACCESS_EVENTS,
  announcement: ANNOUNCEMENT_EVENTS,
  employee: EMPLOYEE_EVENTS,
  lifecycle: LIFECYCLE_EVENTS,
  position: POSITION_EVENTS,
  setup: SETUP_EVENTS,
};

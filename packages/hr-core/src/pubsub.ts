import type { JsonValue } from "@aspen-os/platform/server";

// ─── Employee Events ──────────────────────────────────────────────────────

export const EMPLOYEE_EVENTS = {
  CREATED: "employee.created",
  GROUP_CREATED: "employee.group_created",
  STATUS_CHANGED: "employee.status_changed",
  UPDATED: "employee.updated",
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

// ─── Transition Events ─────────────────────────────────────────────────────

export const TRANSITION_EVENTS = {
  ONBOARDING_COMPLETED: "transition.onboarding_completed",
  ONBOARDING_STARTED: "transition.onboarding_started",
  PROMOTION_APPROVED: "transition.promotion_approved",
  PROMOTION_REQUESTED: "transition.promotion_requested",
  SEPARATION_INITIATED: "transition.separation_initiated",
  TRANSFER_REQUESTED: "transition.transfer_requested",
} as const;

export interface PromotionRequestedEvent {
  promotion: {
    employeeId: string;
    id: string;
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

export interface SeparationInitiatedEvent {
  separation: {
    employeeId: string;
    exitDate: string;
    id: string;
  };
}

export interface OnboardingStartedEvent {
  onboarding: {
    employeeId: string;
    id: string;
  };
}

export interface OnboardingCompletedEvent {
  employeeId: string;
  onboardingId: string;
}

// ─── Setup Events ─────────────────────────────────────────────────────────

export const SETUP_EVENTS = {
  DEPARTMENT_CREATED: "setup.department_created",
  DEPARTMENT_HEAD_CHANGED: "setup.department_head_changed",
  DEPARTMENT_MOVED: "setup.department_moved",
  SETTINGS_UPDATED: "setup.settings_updated",
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

export interface HrSettingsUpdatedEvent {
  changes: Record<string, JsonValue>;
}

// ─── Access Events ────────────────────────────────────────────────────────

export const ACCESS_EVENTS = {
  BRANCH_ACCESS_GRANTED: "access.branch_access_granted",
  BRANCH_ACCESS_REVOKED: "access.branch_access_revoked",
  ROLE_ASSIGNED: "access.role_assigned",
  ROLE_CREATED: "access.role_created",
  ROLE_REVOKED: "access.role_revoked",
  USER_ACTIVATED: "access.user_activated",
  USER_CREATED: "access.user_created",
  USER_DEACTIVATED: "access.user_deactivated",
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

export interface EmployeeEventMap {
  [EMPLOYEE_EVENTS.CREATED]: EmployeeCreatedEvent;
  [EMPLOYEE_EVENTS.GROUP_CREATED]: EmployeeGroupCreatedEvent;
  [EMPLOYEE_EVENTS.STATUS_CHANGED]: EmployeeStatusChangedEvent;
  [EMPLOYEE_EVENTS.UPDATED]: EmployeeUpdatedEvent;
}

export interface TransitionEventMap {
  [TRANSITION_EVENTS.ONBOARDING_COMPLETED]: OnboardingCompletedEvent;
  [TRANSITION_EVENTS.ONBOARDING_STARTED]: OnboardingStartedEvent;
  [TRANSITION_EVENTS.PROMOTION_APPROVED]: PromotionApprovedEvent;
  [TRANSITION_EVENTS.PROMOTION_REQUESTED]: PromotionRequestedEvent;
  [TRANSITION_EVENTS.SEPARATION_INITIATED]: SeparationInitiatedEvent;
  [TRANSITION_EVENTS.TRANSFER_REQUESTED]: TransferRequestedEvent;
}

export interface SetupEventMap {
  [SETUP_EVENTS.DEPARTMENT_CREATED]: DepartmentCreatedEvent;
  [SETUP_EVENTS.DEPARTMENT_HEAD_CHANGED]: DepartmentHeadChangedEvent;
  [SETUP_EVENTS.DEPARTMENT_MOVED]: DepartmentMovedEvent;
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

export type HrEventMap = EmployeeEventMap & TransitionEventMap & SetupEventMap & AccessEventMap;

export type HrCoreEventMap = HrEventMap;

export const events = {
  access: ACCESS_EVENTS,
  employee: EMPLOYEE_EVENTS,
  setup: SETUP_EVENTS,
  transition: TRANSITION_EVENTS,
};

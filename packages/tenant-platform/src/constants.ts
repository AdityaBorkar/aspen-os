export const TENANT_STATUS = {
  ACTIVE: "active",
  CHURNED: "churned",
  ONBOARDING: "onboarding",
  SUSPENDED: "suspended",
} as const;

export type TenantStatus = (typeof TENANT_STATUS)[keyof typeof TENANT_STATUS];

export const SP_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export type SpStatus = (typeof SP_STATUS)[keyof typeof SP_STATUS];

export const AUDIT_ENTITY_TYPE = {
  PLATFORM_USER: "platformUser",
  SERVICE_PROVIDER: "serviceProvider",
  TENANT: "tenant",
} as const;

export type AuditEntityType =
  (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_ACTION = {
  PLATFORM_USER_CREATED: "platform_user_created",
  PLATFORM_USER_DELETED: "platform_user_deleted",
  PLATFORM_USER_UPDATED: "platform_user_updated",
  ROLE_ASSIGNED: "role_assigned",
  SP_ACTIVATED: "sp_activated",
  SP_ASSIGNED: "sp_assigned",
  SP_ASSIGNED_TO_USER: "sp_assigned_to_user",
  SP_CREATED: "sp_created",
  SP_DEACTIVATED: "sp_deactivated",
  SP_UNASSIGNED: "sp_unassigned",
  SP_UPDATED: "sp_updated",
  TENANT_ACTIVATED: "tenant_activated",
  TENANT_CHURNED: "tenant_churned",
  TENANT_PROFILE_UPDATED: "tenant_profile_updated",
  TENANT_PROVISIONED: "tenant_provisioned",
  TENANT_REACTIVATED: "tenant_reactivated",
  TENANT_SUSPENDED: "tenant_suspended",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const ROLES = {
  PLATFORM_ADMIN: "platform_admin",
  SP_USER: "sp_user",
  TENANT_ADMIN: "tenant_admin",
  TENANT_USER: "tenant_user",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

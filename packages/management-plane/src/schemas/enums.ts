import { enum as enum_ } from "valibot";

import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  ROLES,
  SP_STATUS,
  TENANT_STATUS,
} from "../constants";

export const TenantStatusSchema = enum_({
  active: "active",
  churned: "churned",
  onboarding: "onboarding",
  suspended: "suspended",
});

export const SpStatusSchema = enum_({
  active: "active",
  inactive: "inactive",
});

export const AuditActionSchema = enum_({
  platform_user_created: "platform_user_created",
  platform_user_deleted: "platform_user_deleted",
  platform_user_updated: "platform_user_updated",
  role_assigned: "role_assigned",
  sp_activated: "sp_activated",
  sp_assigned: "sp_assigned",
  sp_assigned_to_user: "sp_assigned_to_user",
  sp_created: "sp_created",
  sp_deactivated: "sp_deactivated",
  sp_unassigned: "sp_unassigned",
  sp_updated: "sp_updated",
  tenant_activated: "tenant_activated",
  tenant_churned: "tenant_churned",
  tenant_profile_updated: "tenant_profile_updated",
  tenant_provisioned: "tenant_provisioned",
  tenant_reactivated: "tenant_reactivated",
  tenant_suspended: "tenant_suspended",
});

export const AuditEntityTypeSchema = enum_({
  platformUser: "platformUser",
  serviceProvider: "serviceProvider",
  tenant: "tenant",
});

export const RoleSchema = enum_({
  platform_admin: "platform_admin",
  sp_user: "sp_user",
  tenant_admin: "tenant_admin",
  tenant_user: "tenant_user",
});

export { AUDIT_ACTION, AUDIT_ENTITY_TYPE, ROLES, SP_STATUS, TENANT_STATUS };

import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  ROLES,
  SP_STATUS,
  TENANT_STATUS,
} from "#/utils/constants";

import { picklist } from "valibot";

export const TenantStatusSchema = picklist(Object.values(TENANT_STATUS));

export const SpStatusSchema = picklist(Object.values(SP_STATUS));

export const AuditActionSchema = picklist(Object.values(AUDIT_ACTION));

export const AuditEntityTypeSchema = picklist(Object.values(AUDIT_ENTITY_TYPE));

export const RoleSchema = picklist(Object.values(ROLES));

export { AUDIT_ACTION, AUDIT_ENTITY_TYPE, ROLES, SP_STATUS, TENANT_STATUS };

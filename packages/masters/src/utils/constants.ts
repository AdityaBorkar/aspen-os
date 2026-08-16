export const AUDIT_ENTITY_TYPE = {
  ADDRESS: "masters:address",
  BANK_ACCOUNT: "masters:bank_account",
  CONNECTION: "masters:connection",
  CONTACT: "masters:contact",
  ENTITY: "masters:entity",
  PAYMENT_METHOD: "masters:payment_method",
  UNIT_OF_MEASURE: "masters:unit_of_measure",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_ACTION = {
  ACTIVATED: "activated",
  CREATED: "created",
  CREDENTIAL_ROTATED: "credential_rotated",
  DEACTIVATED: "deactivated",
  DELETED: "deleted",
  PRIMARY_SET: "primary_set",
  TESTED: "tested",
  UPDATED: "updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

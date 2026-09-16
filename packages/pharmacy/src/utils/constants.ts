export const SALE_STATUS = {
  CANCELLED: "cancelled",
  FULFILLED: "fulfilled",
  PARTIAL: "partial",
  PENDING: "pending",
} as const;

export type SaleStatus = (typeof SALE_STATUS)[keyof typeof SALE_STATUS];

export const PO_STATUS = {
  CLOSED: "closed",
  DRAFT: "draft",
  PARTIAL: "partial",
  SENT: "sent",
} as const;

export type PoStatus = (typeof PO_STATUS)[keyof typeof PO_STATUS];

export const GRN_STATUS = {
  BILLED: "billed",
  OPEN: "open",
  VERIFIED: "verified",
} as const;

export type GrnStatus = (typeof GRN_STATUS)[keyof typeof GRN_STATUS];

export const BATCH_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  NEAR_EXPIRY: "near-expiry",
  QUARANTINED: "quarantined",
} as const;

export type BatchStatus = (typeof BATCH_STATUS)[keyof typeof BATCH_STATUS];

export const AUDIT_ACTION = {
  AUTHORIZED: "authorized",
  COLLECTED: "collected",
  CREATED: "created",
  DELETED: "deleted",
  DISCOUNT_APPROVED: "discount_approved",
  DISPENSED: "dispensed",
  ESCALATED: "escalated",
  EXPORT: "export",
  GRANT: "grant",
  LAPSE: "lapse",
  MERGED: "merged",
  OVERRIDE: "override",
  REDEEM: "redeem",
  RETRY: "retry",
  SEED: "seed",
  SHARE: "share",
  SIGNED: "signed",
  UPDATED: "updated",
  VERIFY: "verify",
  VIEWED: "viewed",
  VOID: "void",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const AUDIT_ENTITY_TYPE = {
  PHARMACY: "pharmacy:pharmacy",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

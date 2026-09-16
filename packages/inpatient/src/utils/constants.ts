export const QUEUE_TOKEN_STATUS = {
  CALLED: "called",
  DONE: "done",
  SERVING: "serving",
  SKIPPED: "skipped",
  WAITING: "waiting",
} as const;

export type QueueTokenStatus = (typeof QUEUE_TOKEN_STATUS)[keyof typeof QUEUE_TOKEN_STATUS];

export const TASK_STATUS = {
  CLOSED: "closed",
  DONE: "done",
  OPEN: "open",
  OVERDUE: "overdue",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const DRUG_ADMIN_STATUS = {
  DUE: "due",
  GIVEN: "given",
  HELD: "held",
  MISSED: "missed",
  REFUSED: "refused",
} as const;

export type DrugAdminStatus = (typeof DRUG_ADMIN_STATUS)[keyof typeof DRUG_ADMIN_STATUS];

export const RESIDENT_STATUS = {
  ADMITTED: "admitted",
  DISCHARGED: "discharged",
  ENQUIRY: "enquiry",
  TRANSFERRED: "transferred",
} as const;

export type ResidentStatus = (typeof RESIDENT_STATUS)[keyof typeof RESIDENT_STATUS];

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
  NURSING: "inpatient:nursing",
  RESIDENT: "inpatient:resident",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

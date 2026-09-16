export const RADIO_ORDER_STATUS = {
  AUTHORIZED: "authorized",
  BOOKED: "booked",
  CANCELLED: "cancelled",
  CHECKED_IN: "checked-in",
  PERFORMED: "performed",
  REPORTED: "reported",
  RESCHEDULED: "rescheduled",
} as const;

export type RadioOrderStatus = (typeof RADIO_ORDER_STATUS)[keyof typeof RADIO_ORDER_STATUS];

export const LAB_ORDER_STATUS = {
  AUTHORIZED: "authorized",
  BILLED: "billed",
  CANCELLED: "cancelled",
  COLLECTED: "collected",
  CONFIRMED: "confirmed",
  DELIVERED: "delivered",
  ORDERED: "ordered",
  PAID: "paid",
  PROCESSING: "processing",
  RECEIVED: "received",
  RESULTED: "resulted",
} as const;

export type LabOrderStatus = (typeof LAB_ORDER_STATUS)[keyof typeof LAB_ORDER_STATUS];

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
  DIAGNOSTICS: "diagnostics:diagnostics",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

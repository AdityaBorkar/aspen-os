export const APPOINTMENT_STATUS = {
  BOOKED: "booked",
  CANCELLED: "cancelled",
  CHECKED_IN: "checked-in",
  CONFIRMED: "confirmed",
  DONE: "done",
  IN_CONSULT: "in-consult",
  IN_QUEUE: "in-queue",
  NO_SHOW: "no-show",
  RESCHEDULED: "rescheduled",
} as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const QUEUE_TOKEN_STATUS = {
  CALLED: "called",
  DONE: "done",
  SERVING: "serving",
  SKIPPED: "skipped",
  WAITING: "waiting",
} as const;

export type QueueTokenStatus = (typeof QUEUE_TOKEN_STATUS)[keyof typeof QUEUE_TOKEN_STATUS];

export const VIDEO_STATUS = {
  COMPLETED: "completed",
  CONSENTED: "consented",
  EXPIRED: "expired",
  JOINED: "joined",
  SCHEDULED: "scheduled",
} as const;

export type VideoStatus = (typeof VIDEO_STATUS)[keyof typeof VIDEO_STATUS];

export const CERTIFICATE_STATUS = {
  DRAFT: "draft",
  ISSUED: "issued",
  SIGNED: "signed",
} as const;

export type CertificateStatus = (typeof CERTIFICATE_STATUS)[keyof typeof CERTIFICATE_STATUS];

export const ENCOUNTER_STATUS = {
  OPEN: "open",
  SIGNED: "signed",
} as const;

export type EncounterStatus = (typeof ENCOUNTER_STATUS)[keyof typeof ENCOUNTER_STATUS];

export const VISIT_TYPE = {
  CASUALTY: "casualty",
  FOLLOWUP: "followup",
  NEW: "new",
  TELE: "tele",
} as const;

export type VisitType = (typeof VISIT_TYPE)[keyof typeof VISIT_TYPE];

export const DIAGNOSIS_KIND = {
  CONFIRMED: "confirmed",
  PROVISIONAL: "provisional",
} as const;

export type DiagnosisKind = (typeof DIAGNOSIS_KIND)[keyof typeof DIAGNOSIS_KIND];

export const ORDER_STATUS = {
  ACCEPTED: "accepted",
  CLOSED: "closed",
  COLLECTED: "collected",
  ORDERED: "ordered",
  REPORTED: "reported",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_KIND = {
  ADMIT: "admit",
  LAB: "lab",
  PHARMACY: "pharmacy",
  RADIOLOGY: "radiology",
  REFERRAL: "referral",
  SURGERY: "surgery",
  THERAPY: "therapy",
} as const;

export type OrderKind = (typeof ORDER_KIND)[keyof typeof ORDER_KIND];

export const PLAN_STATUS = {
  APPROVED: "approved",
  COMPLETED: "completed",
  DRAFT: "draft",
  IN_PROGRESS: "in-progress",
} as const;

export type PlanStatus = (typeof PLAN_STATUS)[keyof typeof PLAN_STATUS];

export const STAGE_STATUS = {
  DONE: "done",
  IN_CHAIR: "in-chair",
  PLANNED: "planned",
  SCHEDULED: "scheduled",
} as const;

export type StageStatus = (typeof STAGE_STATUS)[keyof typeof STAGE_STATUS];

export const QUOTE_STATUS = {
  ACCEPTED: "accepted",
  DRAFT: "draft",
  ISSUED: "issued",
} as const;

export type QuoteStatus = (typeof QUOTE_STATUS)[keyof typeof QUOTE_STATUS];

export const CONSENT_STATUS = {
  PENDING: "pending",
  SIGNED: "signed",
  WITHDRAWN: "withdrawn",
} as const;

export type ConsentStatus = (typeof CONSENT_STATUS)[keyof typeof CONSENT_STATUS];

export const LAB_JOB_STATUS = {
  DELIVERED: "delivered",
  IN_LAB: "in-lab",
  RAISED: "raised",
  REMAKE: "remake",
  TRIAL: "trial",
} as const;

export type LabJobStatus = (typeof LAB_JOB_STATUS)[keyof typeof LAB_JOB_STATUS];

export const THERAPY_PACKAGE_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  EXPIRED: "expired",
  PAUSED: "paused",
} as const;

export type TherapyPackageStatus =
  (typeof THERAPY_PACKAGE_STATUS)[keyof typeof THERAPY_PACKAGE_STATUS];

export const SITTING_STATUS = {
  ATTENDED: "attended",
  BOOKED: "booked",
  MISSED: "missed",
} as const;

export type SittingStatus = (typeof SITTING_STATUS)[keyof typeof SITTING_STATUS];

export const REHAB_SITTING_STATUS = {
  BOOKED: "booked",
  CANCELLED: "cancelled",
  CHECKED_IN: "checked-in",
  COMPLETED: "completed",
  IN_PROGRESS: "in-progress",
  NO_SHOW: "no-show",
} as const;

export type RehabSittingStatus = (typeof REHAB_SITTING_STATUS)[keyof typeof REHAB_SITTING_STATUS];

export const COUNSELLING_STATUS = {
  BOOKED: "booked",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  NO_SHOW: "no-show",
} as const;

export type CounsellingStatus = (typeof COUNSELLING_STATUS)[keyof typeof COUNSELLING_STATUS];

export const RISK_LEVEL = {
  HIGH: "high",
  LOW: "low",
  MODERATE: "moderate",
} as const;

export type RiskLevel = (typeof RISK_LEVEL)[keyof typeof RISK_LEVEL];

export const RESIDENT_STATUS = {
  ADMITTED: "admitted",
  DISCHARGED: "discharged",
  ENQUIRY: "enquiry",
  TRANSFERRED: "transferred",
} as const;

export type ResidentStatus = (typeof RESIDENT_STATUS)[keyof typeof RESIDENT_STATUS];

export const DAILY_LOG_STATUS = {
  COMPLETE: "complete",
  OPEN: "open",
} as const;

export type DailyLogStatus = (typeof DAILY_LOG_STATUS)[keyof typeof DAILY_LOG_STATUS];

export const INVOICE_STATUS = {
  DRAFT: "draft",
  FINAL: "final",
  PAID: "paid",
  PARTIAL: "partial",
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export const PACKAGE_STATUS = {
  ACTIVE: "active",
  EXHAUSTED: "exhausted",
  EXPIRED: "expired",
  LAPSED: "lapsed",
} as const;

export type PackageStatus = (typeof PACKAGE_STATUS)[keyof typeof PACKAGE_STATUS];

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

export const SAMPLE_STATUS = {
  ACCEPTED: "accepted",
  COLLECTED: "collected",
  PENDING: "pending",
  RECEIVED: "received",
  REJECTED: "rejected",
} as const;

export type SampleStatus = (typeof SAMPLE_STATUS)[keyof typeof SAMPLE_STATUS];

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

export const HANDOVER_STATUS = {
  DRAFT: "draft",
  SIGNED: "signed",
} as const;

export type HandoverStatus = (typeof HANDOVER_STATUS)[keyof typeof HANDOVER_STATUS];

export const REGISTER_STATUS = {
  DRAFT: "draft",
  FINAL: "final",
} as const;

export type RegisterStatus = (typeof REGISTER_STATUS)[keyof typeof REGISTER_STATUS];

export const MESSAGE_STATUS = {
  DELIVERED: "delivered",
  FAILED: "failed",
  QUEUED: "queued",
  READ: "read",
  SENT: "sent",
} as const;

export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

export const REPORT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export const LEAVE_STATUS = {
  APPLIED: "applied",
  APPROVED: "approved",
  EXPORTED: "exported",
  REJECTED: "rejected",
} as const;

export type LeaveStatus = (typeof LEAVE_STATUS)[keyof typeof LEAVE_STATUS];

export const FACILITY_CATEGORY = {
  CONSULTATION: "consultation",
  DIAGNOSTICS: "diagnostics",
  PHARMACY: "pharmacy",
  PROCEDURE: "procedure",
  SUPPORT: "support",
  TELE: "tele",
  WARD: "ward",
} as const;

export type FacilityCategory = (typeof FACILITY_CATEGORY)[keyof typeof FACILITY_CATEGORY];

export const AUDIT_ACTION = {
  AUTHORIZED: "authorized",
  BREAKGLASS: "breakglass",
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
  VOID: "void",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const AUDIT_ENTITY_TYPE = {
  ALLOPATHY: "healthcare:allopathy",
  APPOINTMENT: "healthcare:appointment",
  AYUSH: "healthcare:ayush",
  BILLING: "healthcare:billing",
  BRANCH: "healthcare:branch",
  CERTIFICATE: "healthcare:certificate",
  COMPANY: "healthcare:company",
  COUNTER: "healthcare:counter",
  DENTAL: "healthcare:dental",
  DIAGNOSTICS: "healthcare:diagnostics",
  ENCOUNTER: "healthcare:encounter",
  FACILITY: "healthcare:facility",
  MASTER: "healthcare:master",
  NURSING: "healthcare:nursing",
  OPERATIONS: "healthcare:operations",
  PATIENT: "healthcare:patient",
  PHARMACY: "healthcare:pharmacy",
  PRACTITIONER: "healthcare:practitioner",
  PSYCH: "healthcare:psych",
  RECALL_RULE: "healthcare:recall-rule",
  RECORDS: "healthcare:records",
  REHAB: "healthcare:rehab",
  RESIDENT: "healthcare:resident",
  SERVICE: "healthcare:service",
  STAFF: "healthcare:staff",
  TEMPLATE: "healthcare:template",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const SETTING_KEYS = {} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const SCHEDULED_JOBS = {} as const;

export type ScheduledJob = (typeof SCHEDULED_JOBS)[keyof typeof SCHEDULED_JOBS];

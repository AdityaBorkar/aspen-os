export const COMPLIANCE_CATEGORY = {
  AUDIT: "audit",
  CERTIFICATE: "certificate",
  DATA_PRIVACY: "data_privacy",
  ENVIRONMENTAL: "environmental",
  FINANCIAL: "financial",
  HR: "hr",
  INSURANCE: "insurance",
  LEGAL: "legal",
  LICENSE: "license",
  OTHER: "other",
  PERMIT: "permit",
  PROPERTY: "property",
  REGULATORY: "regulatory",
  SAFETY: "safety",
  TAX: "tax",
  VEHICLE: "vehicle",
} as const;

export type ComplianceCategory =
  (typeof COMPLIANCE_CATEGORY)[keyof typeof COMPLIANCE_CATEGORY];

export const VERIFICATION_STATUS = {
  ARCHIVED: "archived",
  DRAFT: "draft",
  EXPIRED: "expired",
  OVERDUE: "overdue",
  REJECTED: "rejected",
  RENEWED: "renewed",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  VERIFIED: "verified",
} as const;

export type VerificationStatus =
  (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

export const RENEWAL_FREQUENCY = {
  ANNUAL: "annual",
  BIENNIAL: "biennial",
  MONTHLY: "monthly",
  ONE_TIME: "one_time",
  QUARTERLY: "quarterly",
  SEMI_ANNUAL: "semi_annual",
  TRIENNIAL: "triennial",
} as const;

export type RenewalFrequency =
  (typeof RENEWAL_FREQUENCY)[keyof typeof RENEWAL_FREQUENCY];

export const OBLIGATION_FREQUENCY = {
  ANNUAL: "annual",
  BIENNIAL: "biennial",
  CUSTOM: "custom",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  SEMI_ANNUAL: "semi_annual",
  TRIENNIAL: "triennial",
} as const;

export type ObligationFrequency =
  (typeof OBLIGATION_FREQUENCY)[keyof typeof OBLIGATION_FREQUENCY];

export const REMINDER_CHANNEL = {
  BOTH: "both",
  EMAIL: "email",
  PUBSUB: "pubsub",
} as const;

export type ReminderChannel =
  (typeof REMINDER_CHANNEL)[keyof typeof REMINDER_CHANNEL];

export const AUDIT_ENTITY_TYPE = {
  COMPLIANCE_DOCUMENT: "compliance_document",
  COMPLIANCE_OBLIGATION: "compliance_obligation",
  VERIFICATION_RULE: "verification_rule",
} as const;

export type AuditEntityType =
  (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_ACTION = {
  ARCHIVED: "archived",
  ATTACHMENT_UPLOADED: "attachment_uploaded",
  COMPLETED: "completed",
  CREATED: "created",
  DOCUMENT_GENERATED: "document_generated",
  ESCALATED: "escalated",
  EXPIRED: "expired",
  OBLIGATION_ACTIVATED: "obligation_activated",
  OBLIGATION_DEACTIVATED: "obligation_deactivated",
  OVERDUE: "overdue",
  REJECTED: "rejected",
  REMINDER_SENT: "reminder_sent",
  RENEWED: "renewed",
  REVIEWER_ASSIGNED: "reviewer_assigned",
  SNOOZED: "snoozed",
  SUBMITTED: "submitted",
  UPDATED: "updated",
  VERIFIED: "verified",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const DEFAULT_REMINDER_DAYS_EXPIRY = [90, 60, 30, 7];
export const DEFAULT_REMINDER_DAYS_DUE = [30, 15, 7, 1];
export const DEFAULT_ESCALATION_DAYS = [1, 7, 30];

export const SCHEDULED_JOBS = {
  DAILY_ESCALATION: "compliance:daily-escalation",
  DAILY_EXPIRY_SCAN: "compliance:daily-expiry-scan",
  DAILY_STATUS_TRANSITION: "compliance:daily-status-transition",
  OBLIGATION_GENERATE: "compliance:obligation-generate",
  WEEKLY_SUMMARY: "compliance:weekly-summary",
} as const;

export const CRON_SCHEDULES = {
  DAILY_ESCALATION: "0 9 * * *",
  DAILY_EXPIRY_SCAN: "0 8 * * *",
  DAILY_STATUS_TRANSITION: "0 0 * * *",
  OBLIGATION_GENERATE: "0 6 * * *",
  WEEKLY_SUMMARY: "0 9 * * 1",
} as const;

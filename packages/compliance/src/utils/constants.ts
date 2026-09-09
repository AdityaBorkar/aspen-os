export { COMPLIANCE_CATEGORY, RENEWAL_FREQUENCY } from "@aspen-os/constants";
export type { ComplianceCategory, RenewalFrequency } from "@aspen-os/constants";

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

export type VerificationStatus = (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

export const OBLIGATION_FREQUENCY = {
  ANNUAL: "annual",
  BIENNIAL: "biennial",
  CUSTOM: "custom",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  SEMI_ANNUAL: "semi_annual",
  TRIENNIAL: "triennial",
} as const;

export type ObligationFrequency = (typeof OBLIGATION_FREQUENCY)[keyof typeof OBLIGATION_FREQUENCY];

export const REMINDER_CHANNEL = {
  BOTH: "both",
  EMAIL: "email",
  PUBSUB: "pubsub",
} as const;

export type ReminderChannel = (typeof REMINDER_CHANNEL)[keyof typeof REMINDER_CHANNEL];

export const AUDIT_ENTITY_TYPE = {
  COMPLIANCE_DOCUMENT: "document",
  COMPLIANCE_OBLIGATION: "obligation",
  VERIFICATION_RULE: "verification_rule",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

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

export const SYSTEM_ACTOR = "system";

export const MAX_PERIODS_PER_RUN = 120;

export function reminderDefaults(expiryBased: boolean | undefined): number[] {
  return expiryBased ? DEFAULT_REMINDER_DAYS_EXPIRY : DEFAULT_REMINDER_DAYS_DUE;
}

export const ACTIVE_DOCUMENT_STATUSES = [
  VERIFICATION_STATUS.DRAFT,
  VERIFICATION_STATUS.SUBMITTED,
  VERIFICATION_STATUS.UNDER_REVIEW,
  VERIFICATION_STATUS.VERIFIED,
] as const;

export const EXPIRY_ELIGIBLE_STATUSES = [
  VERIFICATION_STATUS.VERIFIED,
  VERIFICATION_STATUS.SUBMITTED,
  VERIFICATION_STATUS.UNDER_REVIEW,
] as const;

export const OVERDUE_ELIGIBLE_STATUSES = [
  VERIFICATION_STATUS.DRAFT,
  VERIFICATION_STATUS.SUBMITTED,
  VERIFICATION_STATUS.UNDER_REVIEW,
  VERIFICATION_STATUS.VERIFIED,
] as const;

export const TRANSITION_CANDIDATE_STATUSES = [
  VERIFICATION_STATUS.SUBMITTED,
  VERIFICATION_STATUS.UNDER_REVIEW,
  VERIFICATION_STATUS.VERIFIED,
  VERIFICATION_STATUS.REJECTED,
  VERIFICATION_STATUS.EXPIRED,
  VERIFICATION_STATUS.OVERDUE,
] as const;

/**
 * Health-score policy: verified docs add, expired/overdue penalize double,
 * rejected penalizes single. `total` counts non-archived documents.
 * Overlapping expired+overdue states double-penalize by design.
 * Empty tenants score 100 (no evidence of poor health).
 */
export const HEALTH_SCORE_WEIGHTS = {
  expired: -2,
  overdue: -2,
  rejected: -1,
  verified: 1,
} as const;

export const SCHEDULED_JOBS = {
  OBLIGATION_GENERATE: "compliance:obligation-generate",
} as const;

export const CRON_SCHEDULES = {
  OBLIGATION_GENERATE: "0 6 * * *",
} as const;

export type {
  AuditAction,
  AuditEntityType,
  ComplianceCategory,
  ObligationFrequency,
  ReminderChannel,
  RenewalFrequency,
  VerificationStatus,
} from "./constants";
export {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  COMPLIANCE_CATEGORY,
  CRON_SCHEDULES,
  DEFAULT_ESCALATION_DAYS,
  DEFAULT_REMINDER_DAYS_DUE,
  DEFAULT_REMINDER_DAYS_EXPIRY,
  OBLIGATION_FREQUENCY,
  REMINDER_CHANNEL,
  RENEWAL_FREQUENCY,
  SCHEDULED_JOBS,
  VERIFICATION_STATUS,
} from "./constants";
export type {
  ComplianceEventMap,
  DocumentArchivedEvent,
  DocumentAttachmentUploadedEvent,
  DocumentCompletedEvent,
  DocumentCreatedEvent,
  DocumentDueEvent,
  DocumentEscalatedEvent,
  DocumentExpiredEvent,
  DocumentExpiringEvent,
  DocumentGeneratedEvent,
  DocumentOverdueEvent,
  DocumentRejectedEvent,
  DocumentRenewedEvent,
  DocumentReviewerAssignedEvent,
  DocumentSnoozedEvent,
  DocumentSubmittedEvent,
  DocumentUpdatedEvent,
  DocumentVerifiedEvent,
  ObligationActivatedEvent,
  ObligationCreatedEvent,
  ObligationDeactivatedEvent,
  ObligationUpdatedEvent,
  ScheduledJobExecutedEvent,
  WeeklySummaryEvent,
} from "./pubsub-events";
export {
  DOCUMENT_EVENTS,
  OBLIGATION_EVENTS,
  SYSTEM_EVENTS,
} from "./pubsub-events";
export type {
  AuditTrailFilters,
  ComplianceDocumentFilters,
  CreateComplianceDocumentInput,
  CreateObligationInput,
  CreateVerificationRuleInput,
  ObligationFilters,
  UpdateComplianceDocumentInput,
  UpdateObligationInput,
  UpdateVerificationRuleInput,
} from "./schemas";
export {
  AuditActionSchema,
  AuditEntityTypeSchema,
  AuditTrailFiltersSchema,
  ComplianceCategorySchema,
  ComplianceDocumentFiltersSchema,
  CreateComplianceDocumentSchema,
  CreateObligationSchema,
  CreateVerificationRuleSchema,
  ObligationFiltersSchema,
  ObligationFrequencySchema,
  ReminderChannelSchema,
  RenewalFrequencySchema,
  UpdateComplianceDocumentSchema,
  UpdateObligationSchema,
  UpdateVerificationRuleSchema,
  VerificationStatusSchema,
} from "./schemas";

import type { ComplianceCategory, VerificationStatus } from "./constants";

export interface DashboardSummary {
  activeObligations: number;
  byBranch: Record<string, number>;
  byCategory: Record<string, number>;
  bySourceModule: Record<string, number>;
  byStatus: Record<string, number>;
  documentsGenerated30d: number;
  dueSoon: number;
  expired: number;
  expiringSoon: number;
  healthScore: number;
  overdue: number;
  pendingReview: number;
  rejected: number;
  total: number;
  verified: number;
}

export interface TimelineEntry {
  assignedReviewer: string | null;
  assignedTo: string | null;
  category: ComplianceCategory;
  daysRemaining: number;
  documentType: string | null;
  expiryDate: string | null;
  id: string;
  isObligationGenerated: boolean;
  name: string;
  remindersSent: boolean;
  sourceModule: string;
  verificationStatus: VerificationStatus;
}

export interface PeriodPreview {
  dueDate: string | null;
  expiryDate: string | null;
  periodEnd: string | null;
  periodStart: string | null;
}

export interface RenewalChainEntry {
  createdAt: string;
  id: string;
  name: string;
  renewedFrom: string | null;
  verificationStatus: VerificationStatus;
}

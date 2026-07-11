import type { ComplianceCategory, VerificationStatus } from "./constants";

export const COMPLIANCE_EVENTS = {
  DOCUMENT_ARCHIVED: "compliance:document_archived",
  DOCUMENT_ATTACHMENT_UPLOADED: "compliance:document_attachment_uploaded",
  DOCUMENT_COMPLETED: "compliance:document_completed",
  DOCUMENT_CREATED: "compliance:document_created",
  DOCUMENT_DUE: "compliance:document_due",
  DOCUMENT_ESCALATED: "compliance:document_escalated",
  DOCUMENT_EXPIRED: "compliance:document_expired",
  DOCUMENT_EXPIRING: "compliance:document_expiring",
  DOCUMENT_GENERATED: "compliance:document_generated",
  DOCUMENT_OVERDUE: "compliance:document_overdue",
  DOCUMENT_REJECTED: "compliance:document_rejected",
  DOCUMENT_RENEWED: "compliance:document_renewed",
  DOCUMENT_REVIEWER_ASSIGNED: "compliance:document_reviewer_assigned",
  DOCUMENT_SNOOZED: "compliance:document_snoozed",
  DOCUMENT_SUBMITTED: "compliance:document_submitted",
  DOCUMENT_UPDATED: "compliance:document_updated",
  DOCUMENT_VERIFIED: "compliance:document_verified",
  OBLIGATION_ACTIVATED: "compliance:obligation_activated",
  OBLIGATION_CREATED: "compliance:obligation_created",
  OBLIGATION_DEACTIVATED: "compliance:obligation_deactivated",
  OBLIGATION_UPDATED: "compliance:obligation_updated",
  SCHEDULED_JOB_EXECUTED: "compliance:scheduled_job_executed",
  WEEKLY_SUMMARY: "compliance:weekly_summary",
} as const;

export interface DocumentCreatedEvent {
  document: {
    category: ComplianceCategory;
    id: string;
    name: string;
  };
}

export interface DocumentUpdatedEvent {
  changes: Record<string, unknown>;
  document: { id: string; name: string };
}

export interface DocumentSubmittedEvent {
  documentId: string;
  submittedBy: string;
}

export interface DocumentVerifiedEvent {
  category: ComplianceCategory;
  documentId: string;
  sourceEntityId: string | null;
  sourceModule: string;
  verifiedBy: string;
}

export interface DocumentRejectedEvent {
  category: ComplianceCategory;
  documentId: string;
  reason: string;
  rejectedBy: string;
  sourceEntityId: string | null;
  sourceModule: string;
}

export interface DocumentExpiringEvent {
  daysUntilExpiry: number;
  documentId: string;
  sourceEntityId: string | null;
  sourceModule: string;
}

export interface DocumentDueEvent {
  daysUntilDue: number;
  documentId: string;
  sourceEntityId: string | null;
  sourceModule: string;
}

export interface DocumentExpiredEvent {
  category: ComplianceCategory;
  documentId: string;
  sourceEntityId: string | null;
  sourceModule: string;
}

export interface DocumentOverdueEvent {
  category: ComplianceCategory;
  daysOverdue: number;
  documentId: string;
  sourceEntityId: string | null;
  sourceModule: string;
}

export interface DocumentCompletedEvent {
  completedAt: string;
  documentId: string;
  referenceNumber: string | null;
  sourceEntityId: string | null;
  sourceModule: string;
}

export interface DocumentEscalatedEvent {
  daysSinceExpiry: number;
  documentId: string;
  escalationLevel: number;
}

export interface DocumentRenewedEvent {
  newDocumentId: string;
  oldDocumentId: string;
}

export interface DocumentArchivedEvent {
  documentId: string;
}

export interface DocumentReviewerAssignedEvent {
  documentId: string;
  reviewerId: string;
}

export interface DocumentAttachmentUploadedEvent {
  documentId: string;
  storageKey: string;
}

export interface DocumentSnoozedEvent {
  documentId: string;
  snoozedBy: string;
  snoozedUntil: string;
}

export interface DocumentGeneratedEvent {
  documentId: string;
  obligationId: string;
  sourceModule: string;
}

export interface ObligationCreatedEvent {
  obligation: {
    category: ComplianceCategory;
    id: string;
    name: string;
  };
}

export interface ObligationActivatedEvent {
  obligationId: string;
}

export interface ObligationDeactivatedEvent {
  obligationId: string;
}

export interface ObligationUpdatedEvent {
  changes: Record<string, unknown>;
  obligation: { id: string; name: string };
}

export interface WeeklySummaryEvent {
  summary: {
    activeObligations: number;
    documentsGenerated: number;
    expired: number;
    expiringSoon: number;
    overdue: number;
    total: number;
    verified: number;
  };
}

export interface ScheduledJobExecutedEvent {
  errors: number;
  executionTime: number;
  jobName: string;
  recordsProcessed: number;
}

export type ComplianceEventMap = {
  [COMPLIANCE_EVENTS.DOCUMENT_CREATED]: DocumentCreatedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_UPDATED]: DocumentUpdatedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_SUBMITTED]: DocumentSubmittedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_VERIFIED]: DocumentVerifiedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_REJECTED]: DocumentRejectedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_EXPIRING]: DocumentExpiringEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_DUE]: DocumentDueEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_EXPIRED]: DocumentExpiredEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_OVERDUE]: DocumentOverdueEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_COMPLETED]: DocumentCompletedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_ESCALATED]: DocumentEscalatedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_RENEWED]: DocumentRenewedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_ARCHIVED]: DocumentArchivedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_REVIEWER_ASSIGNED]: DocumentReviewerAssignedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_ATTACHMENT_UPLOADED]: DocumentAttachmentUploadedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_SNOOZED]: DocumentSnoozedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_GENERATED]: DocumentGeneratedEvent;
  [COMPLIANCE_EVENTS.OBLIGATION_CREATED]: ObligationCreatedEvent;
  [COMPLIANCE_EVENTS.OBLIGATION_ACTIVATED]: ObligationActivatedEvent;
  [COMPLIANCE_EVENTS.OBLIGATION_DEACTIVATED]: ObligationDeactivatedEvent;
  [COMPLIANCE_EVENTS.OBLIGATION_UPDATED]: ObligationUpdatedEvent;
  [COMPLIANCE_EVENTS.WEEKLY_SUMMARY]: WeeklySummaryEvent;
  [COMPLIANCE_EVENTS.SCHEDULED_JOB_EXECUTED]: ScheduledJobExecutedEvent;
};

export type VerificationStatusChangeEvent = {
  documentId: string;
  fromStatus: VerificationStatus;
  toStatus: VerificationStatus;
};

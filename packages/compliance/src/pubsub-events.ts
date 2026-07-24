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

export const DOCUMENT_EVENTS = {
  ARCHIVED: COMPLIANCE_EVENTS.DOCUMENT_ARCHIVED,
  ATTACHMENT_UPLOADED: COMPLIANCE_EVENTS.DOCUMENT_ATTACHMENT_UPLOADED,
  COMPLETED: COMPLIANCE_EVENTS.DOCUMENT_COMPLETED,
  CREATED: COMPLIANCE_EVENTS.DOCUMENT_CREATED,
  DUE: COMPLIANCE_EVENTS.DOCUMENT_DUE,
  ESCALATED: COMPLIANCE_EVENTS.DOCUMENT_ESCALATED,
  EXPIRED: COMPLIANCE_EVENTS.DOCUMENT_EXPIRED,
  EXPIRING: COMPLIANCE_EVENTS.DOCUMENT_EXPIRING,
  GENERATED: COMPLIANCE_EVENTS.DOCUMENT_GENERATED,
  OVERDUE: COMPLIANCE_EVENTS.DOCUMENT_OVERDUE,
  REJECTED: COMPLIANCE_EVENTS.DOCUMENT_REJECTED,
  RENEWED: COMPLIANCE_EVENTS.DOCUMENT_RENEWED,
  REVIEWER_ASSIGNED: COMPLIANCE_EVENTS.DOCUMENT_REVIEWER_ASSIGNED,
  SNOOZED: COMPLIANCE_EVENTS.DOCUMENT_SNOOZED,
  SUBMITTED: COMPLIANCE_EVENTS.DOCUMENT_SUBMITTED,
  UPDATED: COMPLIANCE_EVENTS.DOCUMENT_UPDATED,
  VERIFIED: COMPLIANCE_EVENTS.DOCUMENT_VERIFIED,
} as const;

export const OBLIGATION_EVENTS = {
  ACTIVATED: COMPLIANCE_EVENTS.OBLIGATION_ACTIVATED,
  CREATED: COMPLIANCE_EVENTS.OBLIGATION_CREATED,
  DEACTIVATED: COMPLIANCE_EVENTS.OBLIGATION_DEACTIVATED,
  UPDATED: COMPLIANCE_EVENTS.OBLIGATION_UPDATED,
} as const;

export const SYSTEM_EVENTS = {
  SCHEDULED_JOB_EXECUTED: COMPLIANCE_EVENTS.SCHEDULED_JOB_EXECUTED,
  WEEKLY_SUMMARY: COMPLIANCE_EVENTS.WEEKLY_SUMMARY,
} as const;

export const events = {
  DOCUMENT_EVENTS,
  OBLIGATION_EVENTS,
  SYSTEM_EVENTS,
};

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

export type DocumentEventMap = {
  [DOCUMENT_EVENTS.ARCHIVED]: DocumentArchivedEvent;
  [DOCUMENT_EVENTS.ATTACHMENT_UPLOADED]: DocumentAttachmentUploadedEvent;
  [DOCUMENT_EVENTS.COMPLETED]: DocumentCompletedEvent;
  [DOCUMENT_EVENTS.CREATED]: DocumentCreatedEvent;
  [DOCUMENT_EVENTS.DUE]: DocumentDueEvent;
  [DOCUMENT_EVENTS.ESCALATED]: DocumentEscalatedEvent;
  [DOCUMENT_EVENTS.EXPIRED]: DocumentExpiredEvent;
  [DOCUMENT_EVENTS.EXPIRING]: DocumentExpiringEvent;
  [DOCUMENT_EVENTS.GENERATED]: DocumentGeneratedEvent;
  [DOCUMENT_EVENTS.OVERDUE]: DocumentOverdueEvent;
  [DOCUMENT_EVENTS.REJECTED]: DocumentRejectedEvent;
  [DOCUMENT_EVENTS.RENEWED]: DocumentRenewedEvent;
  [DOCUMENT_EVENTS.REVIEWER_ASSIGNED]: DocumentReviewerAssignedEvent;
  [DOCUMENT_EVENTS.SNOOZED]: DocumentSnoozedEvent;
  [DOCUMENT_EVENTS.SUBMITTED]: DocumentSubmittedEvent;
  [DOCUMENT_EVENTS.UPDATED]: DocumentUpdatedEvent;
  [DOCUMENT_EVENTS.VERIFIED]: DocumentVerifiedEvent;
};

export type ObligationEventMap = {
  [OBLIGATION_EVENTS.ACTIVATED]: ObligationActivatedEvent;
  [OBLIGATION_EVENTS.CREATED]: ObligationCreatedEvent;
  [OBLIGATION_EVENTS.DEACTIVATED]: ObligationDeactivatedEvent;
  [OBLIGATION_EVENTS.UPDATED]: ObligationUpdatedEvent;
};

export type SystemEventMap = {
  [SYSTEM_EVENTS.SCHEDULED_JOB_EXECUTED]: ScheduledJobExecutedEvent;
  [SYSTEM_EVENTS.WEEKLY_SUMMARY]: WeeklySummaryEvent;
};

export type ComplianceEventMap = DocumentEventMap &
  ObligationEventMap &
  SystemEventMap;

export type VerificationStatusChangeEvent = {
  documentId: string;
  fromStatus: VerificationStatus;
  toStatus: VerificationStatus;
};

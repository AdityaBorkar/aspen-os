import type {
  BranchType,
  ComplianceStatus,
  ConnectionNoteType,
  ConnectionStatus,
} from "./types";

export const ORGANIZATION_EVENTS = {
  BRANDING_UPDATED: "organization:branding_updated",
  UPDATED: "organization:updated",
} as const;

export const BRANCH_EVENTS = {
  ACTIVATED: "branch:activated",
  CLOSED: "branch:closed",
  CREATED: "branch:created",
  DEACTIVATED: "branch:deactivated",
  UPDATED: "branch:updated",
} as const;

export const CONNECTION_EVENTS = {
  CREATED: "connection:created",
  NOTE_ADDED: "connection:note_added",
  STATUS_CHANGED: "connection:status_changed",
  UPDATED: "connection:updated",
} as const;

export const COMPLIANCE_EVENTS = {
  DOCUMENT_CREATED: "compliance:document_created",
  DOCUMENT_EXPIRED: "compliance:document_expired",
  DOCUMENT_EXPIRING: "compliance:document_expiring",
  DOCUMENT_RENEWED: "compliance:document_renewed",
  STATUS_CHANGED: "compliance:status_changed",
} as const;

export interface OrganizationUpdatedEvent {
  changes: Record<string, unknown>;
  organization: { id: string; name: string; slug: string };
}

export interface OrganizationBrandingUpdatedEvent {
  accentColor?: string;
  logo?: string;
  name?: string;
}

export interface BranchCreatedEvent {
  branch: {
    code: string;
    id: string;
    name: string;
    type: BranchType;
  };
}

export interface BranchUpdatedEvent {
  branch: { id: string; name: string };
  changes: Record<string, unknown>;
}

export interface BranchActivatedEvent {
  branchId: string;
}

export interface BranchDeactivatedEvent {
  branchId: string;
}

export interface BranchClosedEvent {
  branchId: string;
  date: string;
}

export interface ConnectionCreatedEvent {
  connection: {
    id: string;
    name: string;
    type: string;
  };
}

export interface ConnectionUpdatedEvent {
  changes: Record<string, unknown>;
  connection: { id: string; name: string };
}

export interface ConnectionStatusChangedEvent {
  connectionId: string;
  fromStatus: ConnectionStatus;
  toStatus: ConnectionStatus;
}

export interface ConnectionNoteAddedEvent {
  connectionId: string;
  note: {
    content: string;
    id: string;
    type: ConnectionNoteType;
  };
}

export interface ComplianceDocumentCreatedEvent {
  document: {
    category: string;
    id: string;
    name: string;
  };
}

export interface ComplianceDocumentExpiringEvent {
  daysUntilExpiry: number;
  document: {
    expiryDate: string;
    id: string;
    name: string;
  };
}

export interface ComplianceDocumentExpiredEvent {
  document: {
    expiryDate: string;
    id: string;
    name: string;
  };
}

export interface ComplianceDocumentRenewedEvent {
  newDocument: { id: string; name: string };
  oldDocument: { id: string; name: string };
}

export interface ComplianceStatusChangedEvent {
  documentId: string;
  fromStatus: ComplianceStatus;
  toStatus: ComplianceStatus;
}

export type OrganizationEventMap = {
  [ORGANIZATION_EVENTS.UPDATED]: OrganizationUpdatedEvent;
  [ORGANIZATION_EVENTS.BRANDING_UPDATED]: OrganizationBrandingUpdatedEvent;
};

export type BranchEventMap = {
  [BRANCH_EVENTS.ACTIVATED]: BranchActivatedEvent;
  [BRANCH_EVENTS.CLOSED]: BranchClosedEvent;
  [BRANCH_EVENTS.CREATED]: BranchCreatedEvent;
  [BRANCH_EVENTS.DEACTIVATED]: BranchDeactivatedEvent;
  [BRANCH_EVENTS.UPDATED]: BranchUpdatedEvent;
};

export type ConnectionEventMap = {
  [CONNECTION_EVENTS.CREATED]: ConnectionCreatedEvent;
  [CONNECTION_EVENTS.NOTE_ADDED]: ConnectionNoteAddedEvent;
  [CONNECTION_EVENTS.STATUS_CHANGED]: ConnectionStatusChangedEvent;
  [CONNECTION_EVENTS.UPDATED]: ConnectionUpdatedEvent;
};

export type ComplianceEventMap = {
  [COMPLIANCE_EVENTS.DOCUMENT_CREATED]: ComplianceDocumentCreatedEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_EXPIRED]: ComplianceDocumentExpiredEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_EXPIRING]: ComplianceDocumentExpiringEvent;
  [COMPLIANCE_EVENTS.DOCUMENT_RENEWED]: ComplianceDocumentRenewedEvent;
  [COMPLIANCE_EVENTS.STATUS_CHANGED]: ComplianceStatusChangedEvent;
};

export type OrganizationDomainEventMap = OrganizationEventMap &
  BranchEventMap &
  ConnectionEventMap &
  ComplianceEventMap;

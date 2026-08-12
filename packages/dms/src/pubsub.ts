export const DOCUMENT_EVENTS = {
  CLASSIFIED: "dms:document_classified",
  DELETED: "dms:document_deleted",
  EXPIRED: "dms:document_expired",
  HOLD_PLACED: "dms:document_hold_placed",
  HOLD_RELEASED: "dms:document_hold_released",
  PURGED: "dms:document_purged",
  RESTORED: "dms:document_restored",
  TAGGED: "dms:document_tagged",
  UNTAGGED: "dms:document_untagged",
  UPDATED: "dms:document_updated",
  UPLOADED: "dms:document_uploaded",
  VERSION_ADDED: "dms:document_version_added",
  VERSION_REVERTED: "dms:document_version_reverted",
} as const;

export const CLASS_EVENTS = {
  ARCHIVED: "dms:class_archived",
  CREATED: "dms:class_created",
  UPDATED: "dms:class_updated",
} as const;

export const CONTACT_EVENTS = {
  CREATED: "dms:contact_created",
  REMOVED: "dms:contact_removed",
  UPDATED: "dms:contact_updated",
} as const;

export const SHARE_EVENTS = {
  CREATED: "dms:share_created",
  REVOKED: "dms:share_revoked",
} as const;

export const VIEW_EVENTS = {
  CREATED: "dms:view_created",
  DELETED: "dms:view_deleted",
  PINNED: "dms:view_pinned",
  UNPINNED: "dms:view_unpinned",
  UPDATED: "dms:view_updated",
} as const;

export const events = {
  CLASS_EVENTS,
  CONTACT_EVENTS,
  DOCUMENT_EVENTS,
  SHARE_EVENTS,
  VIEW_EVENTS,
};

export interface DocumentUploadedEvent {
  batchId?: string;
  contentType: string;
  documentId: string;
  size: number;
  version: number;
}

export interface DocumentVersionAddedEvent {
  documentId: string;
  version: number;
}

export interface DocumentVersionRevertedEvent {
  documentId: string;
  version: number;
}

export interface DocumentClassifiedEvent {
  classId: string;
  docNumber: string;
  documentId: string;
}

export interface DocumentUpdatedEvent {
  changes: Record<string, unknown>;
  documentId: string;
}

export interface DocumentExpiredEvent {
  documentId: string;
  expiryDate: string | null;
}

export interface DocumentDeletedEvent {
  deletedBy: string;
  documentId: string;
}

export interface DocumentRestoredEvent {
  documentId: string;
}

export interface DocumentPurgedEvent {
  documentId: string;
  storageKey: string;
}

export interface DocumentHoldPlacedEvent {
  documentId: string;
  reason: string;
}

export interface DocumentHoldReleasedEvent {
  documentId: string;
  reason: string;
}

export interface DocumentTaggedEvent {
  documentId: string;
  tag: string;
}

export interface DocumentUntaggedEvent {
  documentId: string;
  tag: string;
}

export interface ClassCreatedEvent {
  classId: string;
}

export interface ClassUpdatedEvent {
  classId: string;
}

export interface ClassArchivedEvent {
  classId: string;
}

export interface ContactCreatedEvent {
  contactId: string;
}

export interface ContactUpdatedEvent {
  contactId: string;
}

export interface ContactRemovedEvent {
  contactId: string;
  reason: string;
}

export interface ShareCreatedEvent {
  documentId: string;
  granteeId: string;
  granteeType: "contact" | "user";
  shareId: string;
}

export interface ShareRevokedEvent {
  documentId: string;
  granteeId: string;
  granteeType: "contact" | "user";
  shareId: string;
}

export interface ViewCreatedEvent {
  viewId: string;
}

export interface ViewUpdatedEvent {
  viewId: string;
}

export interface ViewDeletedEvent {
  viewId: string;
}

export interface ViewPinnedEvent {
  viewId: string;
}

export interface ViewUnpinnedEvent {
  viewId: string;
}

export type DocumentEventMap = {
  [DOCUMENT_EVENTS.CLASSIFIED]: DocumentClassifiedEvent;
  [DOCUMENT_EVENTS.DELETED]: DocumentDeletedEvent;
  [DOCUMENT_EVENTS.EXPIRED]: DocumentExpiredEvent;
  [DOCUMENT_EVENTS.HOLD_PLACED]: DocumentHoldPlacedEvent;
  [DOCUMENT_EVENTS.HOLD_RELEASED]: DocumentHoldReleasedEvent;
  [DOCUMENT_EVENTS.PURGED]: DocumentPurgedEvent;
  [DOCUMENT_EVENTS.RESTORED]: DocumentRestoredEvent;
  [DOCUMENT_EVENTS.TAGGED]: DocumentTaggedEvent;
  [DOCUMENT_EVENTS.UNTAGGED]: DocumentUntaggedEvent;
  [DOCUMENT_EVENTS.UPDATED]: DocumentUpdatedEvent;
  [DOCUMENT_EVENTS.UPLOADED]: DocumentUploadedEvent;
  [DOCUMENT_EVENTS.VERSION_ADDED]: DocumentVersionAddedEvent;
  [DOCUMENT_EVENTS.VERSION_REVERTED]: DocumentVersionRevertedEvent;
};

export type ClassEventMap = {
  [CLASS_EVENTS.ARCHIVED]: ClassArchivedEvent;
  [CLASS_EVENTS.CREATED]: ClassCreatedEvent;
  [CLASS_EVENTS.UPDATED]: ClassUpdatedEvent;
};

export type ContactEventMap = {
  [CONTACT_EVENTS.CREATED]: ContactCreatedEvent;
  [CONTACT_EVENTS.REMOVED]: ContactRemovedEvent;
  [CONTACT_EVENTS.UPDATED]: ContactUpdatedEvent;
};

export type ShareEventMap = {
  [SHARE_EVENTS.CREATED]: ShareCreatedEvent;
  [SHARE_EVENTS.REVOKED]: ShareRevokedEvent;
};

export type ViewEventMap = {
  [VIEW_EVENTS.CREATED]: ViewCreatedEvent;
  [VIEW_EVENTS.DELETED]: ViewDeletedEvent;
  [VIEW_EVENTS.PINNED]: ViewPinnedEvent;
  [VIEW_EVENTS.UNPINNED]: ViewUnpinnedEvent;
  [VIEW_EVENTS.UPDATED]: ViewUpdatedEvent;
};

export type DmsEventMap = DocumentEventMap &
  ClassEventMap &
  ContactEventMap &
  ShareEventMap &
  ViewEventMap;

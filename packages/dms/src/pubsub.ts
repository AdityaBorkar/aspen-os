export const FILE_EVENTS = {
  CLASSIFIED: "dms:file_classified",
  DOWNLOADED: "dms:file_downloaded",
  EXPIRED: "dms:file_expired",
  HOLD_PLACED: "dms:file_hold_placed",
  HOLD_RELEASED: "dms:file_hold_released",
  MOVED: "dms:file_moved",
  PURGED: "dms:file_purged",
  RESTORED: "dms:file_restored",
  TRASHED: "dms:file_trashed",
  UPDATED: "dms:file_updated",
  UPLOADED: "dms:file_uploaded",
  VERSION_ADDED: "dms:file_version_added",
  VERSION_REVERTED: "dms:file_version_reverted",
} as const;

export const FOLDER_EVENTS = {
  CREATED: "dms:folder_created",
  MOVED: "dms:folder_moved",
  PURGED: "dms:folder_purged",
  RENAMED: "dms:folder_renamed",
  RESTORED: "dms:folder_restored",
  TRASHED: "dms:folder_trashed",
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

export const PUBLIC_LINK_EVENTS = {
  ACCESSED: "dms:public_link_accessed",
  CREATED: "dms:public_link_created",
  REVOKED: "dms:public_link_revoked",
} as const;

export const FILE_VIEW_EVENTS = {
  CREATED: "dms:file_view_created",
  DELETED: "dms:file_view_deleted",
  UPDATED: "dms:file_view_updated",
} as const;

export const events = {
  CLASS_EVENTS,
  CONTACT_EVENTS,
  FILE_EVENTS,
  FILE_VIEW_EVENTS,
  FOLDER_EVENTS,
  PUBLIC_LINK_EVENTS,
  SHARE_EVENTS,
};

export interface FileUploadedEvent {
  batchId?: string;
  contentType: string;
  fileId: string;
  size: number;
  version: number;
}

export interface FileVersionAddedEvent {
  fileId: string;
  version: number;
}

export interface FileVersionRevertedEvent {
  fileId: string;
  version: number;
}

export interface FileClassifiedEvent {
  classId: string;
  docNumber: string;
  fileId: string;
}

export interface FileUpdatedEvent {
  changes: Record<string, unknown>;
  fileId: string;
}

export interface FileExpiredEvent {
  expiryDate: string | null;
  fileId: string;
}

export interface FileTrashedEvent {
  deletedBy: string;
  fileId: string;
}

export interface FileRestoredEvent {
  fileId: string;
}

export interface FilePurgedEvent {
  fileId: string;
  storageKey: string;
}

export interface FileHoldPlacedEvent {
  fileId: string;
  reason: string;
}

export interface FileHoldReleasedEvent {
  fileId: string;
  reason: string;
}

export interface FileMovedEvent {
  file: {
    id: string;
    name: string;
    path: string | null;
  };
  newPath: string | null;
  oldPath: string | null;
}

export interface FileDownloadedEvent {
  file: {
    id: string;
    name: string;
    ownerId: string;
  };
  userId: string;
}

export interface FolderCreatedEvent {
  folder: {
    id: string;
    name: string;
    ownerId: string;
    parentId: string | null;
    path: string;
  };
}

export interface FolderRenamedEvent {
  folder: {
    id: string;
    name: string;
    path: string;
  };
  oldName: string;
}

export interface FolderMovedEvent {
  folder: {
    id: string;
    name: string;
    path: string;
  };
  newPath: string;
  oldPath: string;
}

export interface FolderTrashedEvent {
  folderId: string;
}

export interface FolderRestoredEvent {
  folderId: string;
}

export interface FolderPurgedEvent {
  folderId: string;
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
  entityId: string;
  entityType: "file" | "folder";
  granteeId: string;
  granteeType: "user" | "group" | "contact";
  shareId: string;
}

export interface ShareRevokedEvent {
  entityId: string;
  entityType: "file" | "folder";
  granteeId: string;
  granteeType: "user" | "group" | "contact";
  shareId: string;
}

export interface PublicLinkCreatedEvent {
  entityId: string;
  entityType: "file" | "folder";
  id: string;
  permission: "view" | "edit";
  token: string;
}

export interface PublicLinkAccessedEvent {
  entityId: string;
  entityType: "file" | "folder";
  id: string;
  ip: string | null;
  token: string;
  userAgent: string | null;
}

export interface PublicLinkRevokedEvent {
  entityId: string;
  entityType: "file" | "folder";
  publicLinkId: string;
}

export interface FileViewCreatedEvent {
  fileViewId: string;
}

export interface FileViewUpdatedEvent {
  fileViewId: string;
}

export interface FileViewDeletedEvent {
  fileViewId: string;
}

export type FileEventMap = {
  [FILE_EVENTS.CLASSIFIED]: FileClassifiedEvent;
  [FILE_EVENTS.DOWNLOADED]: FileDownloadedEvent;
  [FILE_EVENTS.EXPIRED]: FileExpiredEvent;
  [FILE_EVENTS.HOLD_PLACED]: FileHoldPlacedEvent;
  [FILE_EVENTS.HOLD_RELEASED]: FileHoldReleasedEvent;
  [FILE_EVENTS.MOVED]: FileMovedEvent;
  [FILE_EVENTS.PURGED]: FilePurgedEvent;
  [FILE_EVENTS.RESTORED]: FileRestoredEvent;
  [FILE_EVENTS.TRASHED]: FileTrashedEvent;
  [FILE_EVENTS.UPDATED]: FileUpdatedEvent;
  [FILE_EVENTS.UPLOADED]: FileUploadedEvent;
  [FILE_EVENTS.VERSION_ADDED]: FileVersionAddedEvent;
  [FILE_EVENTS.VERSION_REVERTED]: FileVersionRevertedEvent;
};

export type FolderEventMap = {
  [FOLDER_EVENTS.CREATED]: FolderCreatedEvent;
  [FOLDER_EVENTS.MOVED]: FolderMovedEvent;
  [FOLDER_EVENTS.PURGED]: FolderPurgedEvent;
  [FOLDER_EVENTS.RENAMED]: FolderRenamedEvent;
  [FOLDER_EVENTS.RESTORED]: FolderRestoredEvent;
  [FOLDER_EVENTS.TRASHED]: FolderTrashedEvent;
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

export type PublicLinkEventMap = {
  [PUBLIC_LINK_EVENTS.ACCESSED]: PublicLinkAccessedEvent;
  [PUBLIC_LINK_EVENTS.CREATED]: PublicLinkCreatedEvent;
  [PUBLIC_LINK_EVENTS.REVOKED]: PublicLinkRevokedEvent;
};

export type FileViewEventMap = {
  [FILE_VIEW_EVENTS.CREATED]: FileViewCreatedEvent;
  [FILE_VIEW_EVENTS.DELETED]: FileViewDeletedEvent;
  [FILE_VIEW_EVENTS.UPDATED]: FileViewUpdatedEvent;
};

export type DmsEventMap = ClassEventMap &
  ContactEventMap &
  FileEventMap &
  FileViewEventMap &
  FolderEventMap &
  PublicLinkEventMap &
  ShareEventMap;

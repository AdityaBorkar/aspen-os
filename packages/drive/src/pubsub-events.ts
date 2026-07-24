export const DRIVE_EVENTS = {
  FILE_DOWNLOADED: "drive:file_downloaded",
  FILE_UPDATED: "drive:file_updated",
  FILE_UPLOADED: "drive:file_uploaded",
  FOLDER_CREATED: "drive:folder_created",
  FOLDER_RENAMED: "drive:folder_renamed",
  MOVED: "drive:moved",
  PUBLIC_LINK_ACCESSED: "drive:public_link_accessed",
  PUBLIC_LINK_CREATED: "drive:public_link_created",
  PUBLIC_LINK_REVOKED: "drive:public_link_revoked",
  PURGED: "drive:purged",
  RESTORED: "drive:restored",
  SHARED: "drive:shared",
  TRASHED: "drive:trashed",
  UNSHARED: "drive:unshared",
} as const;

export const events = {
  DRIVE_EVENTS,
};

export interface DriveFolderCreatedEvent {
  folder: {
    id: string;
    name: string;
    ownerId: string;
    parentId: string | null;
    path: string;
  };
}

export interface DriveFolderRenamedEvent {
  folder: {
    id: string;
    name: string;
    path: string;
  };
  oldName: string;
}

export interface DriveMovedEvent {
  item: {
    id: string;
    name: string;
    path: string;
  };
  itemType: "file" | "folder";
  newPath: string;
  oldPath: string;
}

export interface DriveFileUploadedEvent {
  file: {
    contentType: string;
    etag: string | null;
    folderId: string | null;
    id: string;
    name: string;
    ownerId: string;
    path: string;
    size: number;
    storageKey: string;
    version: number;
  };
}

export interface DriveFileUpdatedEvent {
  file: {
    contentType: string;
    etag: string | null;
    id: string;
    name: string;
    ownerId: string;
    path: string;
    size: number;
    storageKey: string;
    version: number;
  };
  previousVersion: number;
}

export interface DriveFileDownloadedEvent {
  file: {
    id: string;
    name: string;
    ownerId: string;
  };
  userId: string;
}

export interface DriveSharedEvent {
  share: {
    createdAt: string;
    granteeId: string;
    granteeType: "user" | "group";
    id: string;
    itemId: string;
    itemType: "file" | "folder";
    permission: "viewer" | "editor" | "owner";
    sharedBy: string;
  };
}

export interface DriveUnsharedEvent {
  itemId: string;
  shareId: string;
}

export interface DrivePublicLinkCreatedEvent {
  publicLink: {
    createdBy: string;
    id: string;
    itemId: string;
    itemType: "file" | "folder";
    permission: "view" | "edit";
    token: string;
  };
}

export interface DrivePublicLinkAccessedEvent {
  ip: string | null;
  publicLink: {
    id: string;
    itemId: string;
    token: string;
  };
  userAgent: string | null;
}

export interface DrivePublicLinkRevokedEvent {
  itemId: string;
  publicLinkId: string;
}

export interface DriveTrashedEvent {
  itemId: string;
  itemType: "file" | "folder";
}

export interface DriveRestoredEvent {
  itemId: string;
  itemType: "file" | "folder";
}

export interface DrivePurgedEvent {
  itemId: string;
  itemType: "file" | "folder";
  storageKey: string | null;
}

export type DriveEventMap = {
  [DRIVE_EVENTS.FILE_DOWNLOADED]: DriveFileDownloadedEvent;
  [DRIVE_EVENTS.FILE_UPDATED]: DriveFileUpdatedEvent;
  [DRIVE_EVENTS.FILE_UPLOADED]: DriveFileUploadedEvent;
  [DRIVE_EVENTS.FOLDER_CREATED]: DriveFolderCreatedEvent;
  [DRIVE_EVENTS.FOLDER_RENAMED]: DriveFolderRenamedEvent;
  [DRIVE_EVENTS.MOVED]: DriveMovedEvent;
  [DRIVE_EVENTS.PUBLIC_LINK_ACCESSED]: DrivePublicLinkAccessedEvent;
  [DRIVE_EVENTS.PUBLIC_LINK_CREATED]: DrivePublicLinkCreatedEvent;
  [DRIVE_EVENTS.PUBLIC_LINK_REVOKED]: DrivePublicLinkRevokedEvent;
  [DRIVE_EVENTS.PURGED]: DrivePurgedEvent;
  [DRIVE_EVENTS.RESTORED]: DriveRestoredEvent;
  [DRIVE_EVENTS.SHARED]: DriveSharedEvent;
  [DRIVE_EVENTS.TRASHED]: DriveTrashedEvent;
  [DRIVE_EVENTS.UNSHARED]: DriveUnsharedEvent;
};

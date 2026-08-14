export const ITEM_EVENTS = {
  FILE_DOWNLOADED: "dms:item_file_downloaded",
  FILE_UPDATED: "dms:item_file_updated",
  FILE_UPLOADED: "dms:item_file_uploaded",
  FOLDER_CREATED: "dms:item_folder_created",
  FOLDER_RENAMED: "dms:item_folder_renamed",
  MOVED: "dms:item_moved",
  PUBLIC_LINK_ACCESSED: "dms:item_public_link_accessed",
  PUBLIC_LINK_CREATED: "dms:item_public_link_created",
  PUBLIC_LINK_REVOKED: "dms:item_public_link_revoked",
  PURGED: "dms:item_purged",
  RESTORED: "dms:item_restored",
  SHARED: "dms:item_shared",
  TRASHED: "dms:item_trashed",
  UNSHARED: "dms:item_unshared",
} as const;

export interface ItemFolderCreatedEvent {
  folder: {
    id: string;
    name: string;
    ownerId: string;
    parentId: string | null;
    path: string;
  };
}

export interface ItemFolderRenamedEvent {
  folder: {
    id: string;
    name: string;
    path: string;
  };
  oldName: string;
}

export interface ItemMovedEvent {
  item: {
    id: string;
    name: string;
    path: string;
  };
  itemType: "file" | "folder";
  newPath: string;
  oldPath: string;
}

export interface ItemFileUploadedEvent {
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

export interface ItemFileUpdatedEvent {
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

export interface ItemFileDownloadedEvent {
  file: {
    id: string;
    name: string;
    ownerId: string;
  };
  userId: string;
}

export interface ItemSharedEvent {
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

export interface ItemUnsharedEvent {
  itemId: string;
  shareId: string;
}

export interface ItemPublicLinkCreatedEvent {
  publicLink: {
    createdBy: string;
    id: string;
    itemId: string;
    itemType: "file" | "folder";
    permission: "view" | "edit";
    token: string;
  };
}

export interface ItemPublicLinkAccessedEvent {
  ip: string | null;
  publicLink: {
    id: string;
    itemId: string;
    token: string;
  };
  userAgent: string | null;
}

export interface ItemPublicLinkRevokedEvent {
  itemId: string;
  publicLinkId: string;
}

export interface ItemTrashedEvent {
  itemId: string;
  itemType: "file" | "folder";
}

export interface ItemRestoredEvent {
  itemId: string;
  itemType: "file" | "folder";
}

export interface ItemPurgedEvent {
  itemId: string;
  itemType: "file" | "folder";
  storageKey: string | null;
}

export type ItemEventMap = {
  [ITEM_EVENTS.FILE_DOWNLOADED]: ItemFileDownloadedEvent;
  [ITEM_EVENTS.FILE_UPDATED]: ItemFileUpdatedEvent;
  [ITEM_EVENTS.FILE_UPLOADED]: ItemFileUploadedEvent;
  [ITEM_EVENTS.FOLDER_CREATED]: ItemFolderCreatedEvent;
  [ITEM_EVENTS.FOLDER_RENAMED]: ItemFolderRenamedEvent;
  [ITEM_EVENTS.MOVED]: ItemMovedEvent;
  [ITEM_EVENTS.PUBLIC_LINK_ACCESSED]: ItemPublicLinkAccessedEvent;
  [ITEM_EVENTS.PUBLIC_LINK_CREATED]: ItemPublicLinkCreatedEvent;
  [ITEM_EVENTS.PUBLIC_LINK_REVOKED]: ItemPublicLinkRevokedEvent;
  [ITEM_EVENTS.PURGED]: ItemPurgedEvent;
  [ITEM_EVENTS.RESTORED]: ItemRestoredEvent;
  [ITEM_EVENTS.SHARED]: ItemSharedEvent;
  [ITEM_EVENTS.TRASHED]: ItemTrashedEvent;
  [ITEM_EVENTS.UNSHARED]: ItemUnsharedEvent;
};

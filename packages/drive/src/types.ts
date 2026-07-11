export type {
  ApplyLabelInput,
  CreateFolderInput,
  CreateLabelInput,
  CreatePublicLinkInput,
  CreateShareInput,
  DownloadLinkOptions,
  EmptyTrashOptions,
  FolderDownloadLinkOptions,
  ListByLabelOptions,
  ListFolderOptions,
  ListLabelsOptions,
  ListSharedWithMeOptions,
  ListTrashOptions,
  MoveFileInput,
  MoveFolderInput,
  RenameFileInput,
  RenameFolderInput,
  ResolvePublicLinkInput,
  SearchOptions,
  UpdateFileInput,
  UpdateFolderInput,
  UpdatePublicLinkInput,
  UpdateShareInput,
  UploadFileInput,
} from "./schemas";
export {
  ApplyLabelSchema,
  CreateFolderSchema,
  CreateLabelSchema,
  CreatePublicLinkSchema,
  CreateShareSchema,
  DownloadLinkOptionsSchema,
  DriveGranteeTypeSchema,
  DriveItemTypeSchema,
  DrivePermissionSchema,
  DrivePublicLinkPermissionSchema,
  DriveSearchScopeSchema,
  DriveSortOrderSchema,
  EmptyTrashOptionsSchema,
  FolderDownloadLinkOptionsSchema,
  HexColorSchema,
  ItemNameSchema,
  LabelNameSchema,
  ListByLabelOptionsSchema,
  ListFolderOptionsSchema,
  ListLabelsOptionsSchema,
  ListSharedWithMeOptionsSchema,
  ListTrashOptionsSchema,
  MoveFileSchema,
  MoveFolderSchema,
  RenameFileSchema,
  RenameFolderSchema,
  ResolvePublicLinkSchema,
  SearchOptionsSchema,
  UpdateFileSchema,
  UpdateFolderSchema,
  UpdatePublicLinkSchema,
  UpdateShareSchema,
  UploadFileSchema,
} from "./schemas";

export type DriveItemType = "file" | "folder";
export type DriveGranteeType = "user" | "group";
export type DrivePermission = "viewer" | "editor" | "owner";
export type DrivePublicLinkPermission = "view" | "edit";
export type DriveSearchScope = "all" | "my_files" | "shared_with_me";

export interface BreadcrumbItem {
  id: string;
  name: string;
  path: string;
}

export interface PathResolution {
  id: string;
  name: string;
  path: string;
  type: DriveItemType;
}

export interface FolderWithMetadata {
  childCount: number;
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  isTrashed: boolean;
  name: string;
  ownerId: string;
  parentId: string | null;
  path: string;
  totalSize: number;
  trashedAt: Date | null;
  updatedAt: Date;
}

export interface SearchResult {
  files: DriveFileRow[];
  folders: DriveFolderRow[];
}

export type DriveFolderRow = {
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  isTrashed: boolean;
  name: string;
  ownerId: string;
  parentId: string | null;
  path: string;
  trashedAt: Date | null;
  updatedAt: Date;
};

export type DriveFileRow = {
  contentType: string;
  createdAt: Date;
  description: string | null;
  etag: string | null;
  folderId: string | null;
  id: string;
  isTrashed: boolean;
  name: string;
  ownerId: string;
  path: string;
  size: number;
  storageKey: string;
  trashedAt: Date | null;
  updatedAt: Date;
  version: number;
};

export type DriveFileVersionRow = {
  contentType: string;
  createdAt: Date;
  etag: string | null;
  fileId: string;
  id: string;
  size: number;
  storageKey: string;
  uploadedBy: string;
  version: number;
};

export type DriveLabelRow = {
  color: string;
  createdAt: Date;
  id: string;
  isGlobal: boolean;
  name: string;
  ownerId: string | null;
};

export type DriveShareRow = {
  createdAt: Date;
  expiresAt: Date | null;
  granteeId: string;
  granteeType: DriveGranteeType;
  id: string;
  itemId: string;
  itemType: DriveItemType;
  message: string | null;
  permission: DrivePermission;
  sharedBy: string;
};

export type DrivePublicLinkRow = {
  createdAt: Date;
  createdBy: string;
  expiresAt: Date | null;
  id: string;
  isActive: boolean;
  itemId: string;
  itemType: DriveItemType;
  maxViews: number | null;
  password: string | null;
  permission: DrivePublicLinkPermission;
  token: string;
  viewCount: number;
};

export type DriveAccessLogRow = {
  accessedBy: string | null;
  action: string;
  createdAt: Date;
  id: string;
  ip: string | null;
  itemId: string;
  itemType: DriveItemType;
  publicLinkId: string | null;
  userAgent: string | null;
};

export type DriveModuleConfig = {
  allowedContentTypes?: string[];
  defaultDownloadLinkExpiry?: number;
  maxDownloadLinkExpiry?: number;
  maxFileSize?: number;
  maxNestingDepth?: number;
  maxVersions?: number;
  trashRetentionDays?: number;
};

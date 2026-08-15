import type { DmsAccessLog, NewDmsAccessLog } from "#/db-schemas/access-log";
import type { DmsFile, NewDmsFile } from "#/db-schemas/file";
import type { DmsFileVersion, NewDmsFileVersion } from "#/db-schemas/file-version";
import type { DmsFolder, NewDmsFolder } from "#/db-schemas/folder";
import type { DmsLabel, NewDmsLabel } from "#/db-schemas/label";
import type { DmsPublicLink, NewDmsPublicLink } from "#/db-schemas/public-link";
import type { CompressionOption } from "#/schemas";
import type { EntityType } from "#/utils/constants";

export type { DmsClass, NewDmsClass } from "#/db-schemas/class";
export type { DmsClassField, NewDmsClassField } from "#/db-schemas/class-field";
export type { DmsContact, NewDmsContact } from "#/db-schemas/contact";
export type { DmsEntityLabel, NewDmsEntityLabel } from "#/db-schemas/entity-label";
export type { DmsFileView, NewDmsFileView } from "#/db-schemas/file-view";
export type { DmsLegalHold, NewDmsLegalHold } from "#/db-schemas/legal-hold";
export type { DmsPin, NewDmsPin } from "#/db-schemas/pin";
export type { DmsSetting, NewDmsSetting } from "#/db-schemas/setting";
export type { DmsShare, NewDmsShare } from "#/db-schemas/share";
export type {
  ClassArchivedEvent,
  ClassCreatedEvent,
  ClassUpdatedEvent,
  ContactCreatedEvent,
  ContactRemovedEvent,
  ContactUpdatedEvent,
  DmsEventMap,
  FileClassifiedEvent,
  FileDownloadedEvent,
  FileExpiredEvent,
  FileHoldPlacedEvent,
  FileHoldReleasedEvent,
  FileMovedEvent,
  FilePurgedEvent,
  FileRestoredEvent,
  FileTrashedEvent,
  FileUpdatedEvent,
  FileUploadedEvent,
  FileVersionAddedEvent,
  FileVersionRevertedEvent,
  FileViewCreatedEvent,
  FileViewDeletedEvent,
  FileViewUpdatedEvent,
  FolderCreatedEvent,
  FolderMovedEvent,
  FolderPurgedEvent,
  FolderRenamedEvent,
  FolderRestoredEvent,
  FolderTrashedEvent,
  PublicLinkAccessedEvent,
  PublicLinkCreatedEvent,
  PublicLinkRevokedEvent,
  ShareCreatedEvent,
  ShareRevokedEvent,
} from "#/pubsub";
export {
  CLASS_EVENTS,
  CONTACT_EVENTS,
  events,
  FILE_EVENTS,
  FILE_VIEW_EVENTS,
  FOLDER_EVENTS,
  PUBLIC_LINK_EVENTS,
  SHARE_EVENTS,
} from "#/pubsub";
export type {
  AddMetadataInput,
  ApplyFileViewInput,
  ApplyLabelInput,
  ClassifyFileInput,
  CompressionOption,
  ContactFilters,
  CreateClassFieldInput,
  CreateContactInput,
  CreateFileViewInput,
  CreateFolderInput,
  CreateLabelInput,
  CreatePublicLinkInput,
  CreateShareInput,
  DownloadOptions,
  EmptyTrashOptions,
  FileViewCondition,
  FileViewSort,
  FolderDownloadLinkOptions,
  ListByLabelOptions,
  ListFolderOptions,
  ListLabelsOptions,
  ListSharedWithMeOptions,
  ListTrashOptions,
  MoveFileInput,
  MoveFolderInput,
  NewVersionInput,
  QuickSearchInput,
  RemoveContactInput,
  RemoveMetadataInput,
  RenameFileInput,
  RenameFolderInput,
  ResolvePublicLinkInput,
  ResolveShareTokenInput,
  SearchOptions,
  TriageFilters,
  UpdateClassFieldInput,
  UpdateContactInput,
  UpdateFileInput,
  UpdateFileViewInput,
  UpdateFolderInput,
  UpdateLabelInput,
  UpdatePublicLinkInput,
  UpdateShareInput,
  UploadBulkInput,
  UploadFileInput,
} from "#/schemas";
export {
  AddMetadataSchema,
  ApplyFileViewSchema,
  ApplyLabelSchema,
  ArchiveClassSchema,
  ClassFiltersSchema,
  ClassifyFileSchema,
  CompressionModeSchema,
  CompressionOptionSchema,
  ContactFiltersSchema,
  CreateClassFieldSchema,
  CreateClassSchema,
  CreateContactSchema,
  CreateFileViewSchema,
  CreateFolderSchema,
  CreateLabelSchema,
  CreatePublicLinkSchema,
  CreateShareSchema,
  DateRangeSchema,
  DownloadOptionsSchema,
  EmailSchema,
  EmptyTrashOptionsSchema,
  EntityTypeSchema,
  FieldKeySchema,
  FileIdSchema,
  FileNameSchema,
  FileNamingSchema,
  FileStatusSchema,
  FileViewConditionSchema,
  FileViewSortSchema,
  FolderDownloadLinkOptionsSchema,
  GranteeTypeSchema,
  HexColorSchema,
  IdSchema,
  LabelNameSchema,
  LabelSchema,
  ListByLabelOptionsSchema,
  ListFolderOptionsSchema,
  ListLabelsOptionsSchema,
  ListSharedWithMeOptionsSchema,
  ListTrashOptionsSchema,
  MetadataSchema,
  MoveFileSchema,
  MoveFolderSchema,
  NameSchema,
  NewVersionSchema,
  PinItemTypeSchema,
  PublicLinkPermissionSchema,
  QuickSearchSchema,
  RemoveContactSchema,
  RemoveMetadataSchema,
  RenameFileSchema,
  RenameFolderSchema,
  ResolvePublicLinkSchema,
  ResolveShareTokenSchema,
  SearchScopeSchema,
  SearchSortOrderSchema,
  SearchOptionsSchema,
  SharePermissionSchema,
  SizeRangeSchema,
  TriageFiltersSchema,
  UpdateClassFieldSchema,
  UpdateClassSchema,
  UpdateContactSchema,
  UpdateFileSchema,
  UpdateFileViewSchema,
  UpdateFolderSchema,
  UpdateLabelSchema,
  UpdatePublicLinkSchema,
  UpdateShareSchema,
  UploadBulkSchema,
  UploadFileSchema,
  WithFileIdSchema,
  WithIdSchema,
} from "#/schemas";
export type { ArchiveJobData, ArchiveResult } from "#/services/archive-service";
export { ArchiveTooLargeError } from "#/services/archive-service";
export type {
  AuditAction,
  AuditEntityType,
  CompressionMode,
  EntityType,
  FieldType,
  FileStatus,
  GranteeType,
  PinItemType,
  PublicLinkPermission,
  ScheduledJob,
  SettingKey,
  SharePermission,
} from "#/utils/constants";
export {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  COMPRESSION_MODE,
  ENTITY_TYPE,
  FILE_STATUS,
  FIELD_TYPE,
  GRANTEE_TYPE,
  PIN_ITEM_TYPE,
  PUBLIC_LINK_PERMISSION,
  SCHEDULED_JOBS,
  SETTING_KEYS,
  SHARE_PERMISSION,
} from "#/utils/constants";
export type { ResolvedPublicLink } from "#/workflows/public-link/resolve";
export type {
  DmsAccessLog,
  DmsFile,
  DmsFileVersion,
  DmsFolder,
  DmsLabel,
  DmsPublicLink,
  NewDmsAccessLog,
  NewDmsFile,
  NewDmsFileVersion,
  NewDmsFolder,
  NewDmsLabel,
  NewDmsPublicLink,
};

export type DmsFileRow = DmsFile;
export type DmsFolderRow = DmsFolder;
export type DmsFileVersionRow = DmsFileVersion;
export type DmsLabelRow = DmsLabel;
export type DmsPublicLinkRow = DmsPublicLink;
export type DmsAccessLogRow = DmsAccessLog;

export interface BreadcrumbItem {
  id: string;
  name: string;
  path: string;
}

export interface PathResolution {
  id: string;
  name: string;
  path: string | null;
  type: EntityType;
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
  files: DmsFileRow[];
  folders: DmsFolderRow[];
}

export type SearchScope = "all" | "my_files" | "shared_with_me";

export interface DmsModuleConfig {
  allowedContentTypes?: string[];
  defaultAutoPurgeEveryHours?: number;
  defaultCompression?: CompressionOption;
  defaultDownloadLinkExpiry?: number;
  defaultRetentionDays?: number;
  maxDownloadLinkExpiry?: number;
  maxFileSize?: number;
  maxNestingDepth?: number;
  maxVersions?: number;
  trashRetentionDays?: number;
}

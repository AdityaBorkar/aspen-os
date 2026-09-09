import type { DmsAccessLog, NewDmsAccessLog } from "#/db-schemas/access-log";
import type { DmsFile, NewDmsFile } from "#/db-schemas/file";
import type { DmsFileVersion, NewDmsFileVersion } from "#/db-schemas/file-version";
import type { DmsFolder, NewDmsFolder } from "#/db-schemas/folder";
import type { DmsPublicLink, NewDmsPublicLink } from "#/db-schemas/public-link";
import type { CompressionOption } from "#/schemas";
import type { EntityType } from "#/utils/constants";

import type { MasterLabel, NewMasterLabel } from "@aspen-os/masters";

export type { DmsClass, NewDmsClass } from "#/db-schemas/class";
export type { DmsClassField, NewDmsClassField } from "#/db-schemas/class-field";
export type { DmsEntityLabel, NewDmsEntityLabel } from "#/db-schemas/entity-label";
export type { DmsLegalHold, NewDmsLegalHold } from "#/db-schemas/legal-hold";
export type { DmsSetting, NewDmsSetting } from "#/db-schemas/setting";
export type { DmsShare, NewDmsShare } from "#/db-schemas/share";
export type {
  ClassArchivedEvent,
  ClassCreatedEvent,
  ClassUpdatedEvent,
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
  events,
  FILE_EVENTS,
  FOLDER_EVENTS,
  PUBLIC_LINK_EVENTS,
  SHARE_EVENTS,
} from "#/pubsub";
export type {
  AddMetadataInput,
  ApplyLabelInput,
  ClassifyFileInput,
  CompressionOption,
  CreateClassFieldInput,
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
  RemoveMetadataInput,
  RenameFileInput,
  RenameFolderInput,
  ResolvePublicLinkInput,
  ResolveShareTokenInput,
  SearchOptions,
  TriageFilters,
  UpdateClassFieldInput,
  UpdateFileInput,
  UpdateFolderInput,
  UpdateLabelInput,
  UpdatePublicLinkInput,
  UpdateShareInput,
  UploadBulkInput,
  UploadFileInput,
} from "#/schemas";
export {
  AddMetadataSchema,
  ApplyLabelSchema,
  ArchiveClassSchema,
  assertLabelOwner,
  ClassFiltersSchema,
  ClassifyFileSchema,
  CompressionModeSchema,
  CompressionOptionSchema,
  CreateClassFieldSchema,
  CreateClassSchema,
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
  nonEmptyString,
  parseShareExpiry,
  PublicLinkPermissionSchema,
  QuickSearchSchema,
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
  UpdateFileSchema,
  UpdateFolderSchema,
  UpdateLabelSchema,
  UpdatePublicLinkSchema,
  UpdateShareSchema,
  UploadBulkSchema,
  UploadFileSchema,
  WithFileIdSchema,
  WithIdSchema,
} from "#/schemas";
export type { ArchiveJobData, ArchiveResult } from "#/workflow-steps/archive-service";
export { ArchiveTooLargeError } from "#/workflow-steps/archive-service";
export type {
  AuditAction,
  AuditEntityType,
  CompressionMode,
  EntityType,
  FieldType,
  FileStatus,
  GranteeType,
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
  DmsPublicLink,
  NewDmsAccessLog,
  NewDmsFile,
  NewDmsFileVersion,
  NewDmsFolder,
  NewDmsPublicLink,
};
export type DmsLabel = MasterLabel;
export type NewDmsLabel = NewMasterLabel;

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

// Derived from DmsFolder plus computed metadata; value re-exports above stay
// here to preserve existing import paths.
export type FolderWithMetadata = Pick<
  DmsFolder,
  | "color"
  | "created_at"
  | "description"
  | "id"
  | "is_trashed"
  | "name"
  | "owner_id"
  | "parent_id"
  | "path"
  | "trashed_at"
  | "updated_at"
> & { childCount: number; totalSize: number };

export interface SearchResult {
  files: DmsFile[];
  folders: DmsFolder[];
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

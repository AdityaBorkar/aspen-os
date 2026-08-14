import type { DmsAccessLog, NewDmsAccessLog } from "./db-schemas/access-log";
import type { DmsFile, NewDmsFile } from "./db-schemas/file";
import type {
  DmsFileVersion,
  NewDmsFileVersion,
} from "./db-schemas/file-version";
import type { DmsFolder, NewDmsFolder } from "./db-schemas/folder";
import type { DmsItemShare, NewDmsItemShare } from "./db-schemas/item-share";
import type { DmsLabel, NewDmsLabel } from "./db-schemas/label";
import type { DmsPublicLink, NewDmsPublicLink } from "./db-schemas/public-link";
import type { CompressionOption } from "./schemas";
import type { ItemType } from "./utils/constants";

export type { DmsClassField, NewDmsClassField } from "./db-schemas/class-field";
export type { DmsContact, NewDmsContact } from "./db-schemas/contact";
export type { DmsDocument, NewDmsDocument } from "./db-schemas/document";
export type { DmsDocumentClass } from "./db-schemas/document-class";
export type {
  DmsDocumentTag,
  NewDmsDocumentTag,
} from "./db-schemas/document-tag";
export type {
  DmsDocumentVersion,
  NewDmsDocumentVersion,
} from "./db-schemas/document-version";
export type {
  DmsItemLabel,
  NewDmsItemLabel,
} from "./db-schemas/item-label";
export type { DmsLegalHold, NewDmsLegalHold } from "./db-schemas/legal-hold";
export type { DmsPin, NewDmsPin } from "./db-schemas/pin";
export type { DmsSetting, NewDmsSetting } from "./db-schemas/setting";
export type { DmsShare, NewDmsShare } from "./db-schemas/share";
export type { DmsTag, NewDmsTag } from "./db-schemas/tag";
export type { DmsView, NewDmsView } from "./db-schemas/view";
export type {
  ItemFileDownloadedEvent,
  ItemFileUpdatedEvent,
  ItemFileUploadedEvent,
  ItemFolderCreatedEvent,
  ItemFolderRenamedEvent,
  ItemMovedEvent,
  ItemPublicLinkAccessedEvent,
  ItemPublicLinkCreatedEvent,
  ItemPublicLinkRevokedEvent,
  ItemPurgedEvent,
  ItemRestoredEvent,
  ItemSharedEvent,
  ItemTrashedEvent,
  ItemUnsharedEvent,
} from "./item-pubsub";
export type {
  ClassArchivedEvent,
  ClassCreatedEvent,
  ClassUpdatedEvent,
  ContactCreatedEvent,
  ContactRemovedEvent,
  ContactUpdatedEvent,
  DmsEventMap,
  DocumentClassifiedEvent,
  DocumentDeletedEvent,
  DocumentExpiredEvent,
  DocumentHoldPlacedEvent,
  DocumentHoldReleasedEvent,
  DocumentPurgedEvent,
  DocumentRestoredEvent,
  DocumentTaggedEvent,
  DocumentUntaggedEvent,
  DocumentUpdatedEvent,
  DocumentUploadedEvent,
  DocumentVersionAddedEvent,
  DocumentVersionRevertedEvent,
  ShareCreatedEvent,
  ShareRevokedEvent,
  ViewCreatedEvent,
  ViewDeletedEvent,
  ViewPinnedEvent,
  ViewUnpinnedEvent,
  ViewUpdatedEvent,
} from "./pubsub";
export {
  CLASS_EVENTS,
  CONTACT_EVENTS,
  DOCUMENT_EVENTS,
  events,
  ITEM_EVENTS,
  SHARE_EVENTS,
  VIEW_EVENTS,
} from "./pubsub";
export type {
  ApplyLabelInput,
  ApplyViewInput,
  ClassifyDocumentInput,
  ContactFilters,
  CreateClassFieldInput,
  CreateContactInput,
  CreateDocumentClassInput,
  CreateFolderInput,
  CreateItemShareInput,
  CreateLabelInput,
  CreatePublicLinkInput,
  CreateShareInput,
  CreateViewInput,
  DownloadLinkOptions,
  DriveSearchOptions,
  EmptyTrashOptions,
  FolderDownloadLinkOptions,
  ListByLabelOptions,
  ListFolderOptions,
  ListLabelsOptions,
  ListSharedWithMeOptions,
  ListTrashOptions,
  MoveFolderInput,
  MoveItemFileInput,
  QuickSearchInput,
  RemoveContactInput,
  RemoveShareInput,
  RenameFolderInput,
  RenameItemFileInput,
  ResolvePublicLinkInput,
  ResolveShareTokenInput,
  SearchOptions,
  SetDefaultViewInput,
  TriageFilters,
  UpdateClassFieldInput,
  UpdateContactInput,
  UpdateDocumentClassInput,
  UpdateDocumentInput,
  UpdateFolderInput,
  UpdateItemFileInput,
  UpdateItemShareInput,
  UpdatePublicLinkInput,
  UpdateShareInput,
  UpdateViewInput,
  UploadItemFileInput,
  ViewCondition,
  ViewSort,
} from "./schemas";
export {
  AddMetadataSchema,
  ApplyLabelSchema,
  ApplyViewSchema,
  ArchiveClassSchema,
  ClassFiltersSchema,
  ClassifyDocumentSchema,
  CompressionModeSchema,
  CompressionOptionSchema,
  ContactFiltersSchema,
  CreateClassFieldSchema,
  CreateContactSchema,
  CreateDocumentClassSchema,
  CreateFolderSchema,
  CreateItemShareSchema,
  CreateLabelSchema,
  CreatePublicLinkSchema,
  CreateShareSchema,
  CreateViewSchema,
  DateRangeSchema,
  DocumentStatusSchema,
  DownloadLinkOptionsSchema,
  DownloadOptionsSchema,
  DriveSearchOptionsSchema,
  DriveSearchScopeSchema,
  DriveSortOrderSchema,
  EmailSchema,
  EmptyTrashOptionsSchema,
  FieldTypeSchema,
  FileNameSchema,
  FileNamingSchema,
  FolderDownloadLinkOptionsSchema,
  GranteeTypeSchema,
  HexColorSchema,
  IdSchema,
  ItemGranteeTypeSchema,
  ItemNameSchema,
  ItemPermissionSchema,
  ItemTypeSchema,
  LabelNameSchema,
  ListByLabelOptionsSchema,
  ListFolderOptionsSchema,
  ListLabelsOptionsSchema,
  ListSharedWithMeOptionsSchema,
  ListTrashOptionsSchema,
  MetadataSchema,
  MoveFolderSchema,
  MoveItemFileSchema,
  NameSchema,
  NewVersionSchema,
  PinItemTypeSchema,
  PinViewSchema,
  PublicLinkPermissionSchema,
  QuickSearchSchema,
  RemoveContactSchema,
  RemoveMetadataSchema,
  RemoveShareSchema,
  RenameFolderSchema,
  RenameItemFileSchema,
  ResolvePublicLinkSchema,
  ResolveShareTokenSchema,
  SearchOptionsSchema,
  SetDefaultViewSchema,
  SharePermissionSchema,
  SizeRangeSchema,
  TagDocumentSchema,
  TagInputSchema,
  TriageFiltersSchema,
  UpdateClassFieldSchema,
  UpdateContactSchema,
  UpdateDocumentClassSchema,
  UpdateDocumentSchema,
  UpdateFolderSchema,
  UpdateItemFileSchema,
  UpdateItemShareSchema,
  UpdatePublicLinkSchema,
  UpdateShareSchema,
  UpdateViewSchema,
  UploadBulkSchema,
  UploadDocumentSchema,
  UploadItemFileSchema,
  ViewConditionSchema,
  ViewSortSchema,
} from "./schemas";
export type {
  ArchiveJobData,
  ArchiveResult,
} from "./services/item-archive-service";
export { ArchiveTooLargeError } from "./services/item-archive-service";
export type {
  AuditAction,
  AuditEntityType,
  CompressionMode,
  DocumentStatus,
  FieldType,
  GranteeType,
  ItemGranteeType,
  ItemPermission,
  PinItemType,
  PublicLinkPermission,
  ScheduledJob,
  SettingKey,
  SharePermission,
} from "./utils/constants";
export {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  COMPRESSION_MODE,
  DOCUMENT_STATUS,
  FIELD_TYPE,
  GRANTEE_TYPE,
  ITEM_GRANTEE_TYPE,
  ITEM_PERMISSION,
  ITEM_TYPE,
  PIN_ITEM_TYPE,
  PUBLIC_LINK_PERMISSION,
  SCHEDULED_JOBS,
  SETTING_KEYS,
  SHARE_PERMISSION,
} from "./utils/constants";
export type { ResolvedPublicLink } from "./workflows/item-public-link.resolve";
export type {
  DmsAccessLog,
  DmsFile,
  DmsFileVersion,
  DmsFolder,
  DmsItemShare,
  DmsLabel,
  DmsPublicLink,
  ItemType,
  NewDmsAccessLog,
  NewDmsFile,
  NewDmsFileVersion,
  NewDmsFolder,
  NewDmsItemShare,
  NewDmsLabel,
  NewDmsPublicLink,
};

export type DmsFileRow = DmsFile;
export type DmsFolderRow = DmsFolder;
export type DmsFileVersionRow = DmsFileVersion;
export type DmsLabelRow = DmsLabel;
export type DmsItemShareRow = DmsItemShare;
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
  path: string;
  type: ItemType;
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

export type DriveSearchScope = "all" | "my_files" | "shared_with_me";

export type DmsModuleConfig = {
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
};

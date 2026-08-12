import type { CompressionOption } from "./schemas";

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
export type { DmsLegalHold, NewDmsLegalHold } from "./db-schemas/legal-hold";
export type { DmsPin, NewDmsPin } from "./db-schemas/pin";
export type { DmsSetting, NewDmsSetting } from "./db-schemas/setting";
export type { DmsShare, NewDmsShare } from "./db-schemas/share";
export type { DmsTag, NewDmsTag } from "./db-schemas/tag";
export type { DmsView, NewDmsView } from "./db-schemas/view";
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
  SHARE_EVENTS,
  VIEW_EVENTS,
} from "./pubsub";
export type {
  ApplyViewInput,
  ClassifyDocumentInput,
  ContactFilters,
  CreateClassFieldInput,
  CreateContactInput,
  CreateDocumentClassInput,
  CreateShareInput,
  CreateViewInput,
  QuickSearchInput,
  RemoveContactInput,
  RemoveShareInput,
  ResolveShareTokenInput,
  SearchOptions,
  SetDefaultViewInput,
  TriageFilters,
  UpdateClassFieldInput,
  UpdateContactInput,
  UpdateDocumentClassInput,
  UpdateDocumentInput,
  UpdateShareInput,
  UpdateViewInput,
  ViewCondition,
  ViewSort,
} from "./schemas";
export {
  AddMetadataSchema,
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
  CreateShareSchema,
  CreateViewSchema,
  DateRangeSchema,
  DocumentStatusSchema,
  DownloadOptionsSchema,
  EmailSchema,
  FieldTypeSchema,
  FileNameSchema,
  FileNamingSchema,
  GranteeTypeSchema,
  IdSchema,
  MetadataSchema,
  NameSchema,
  NewVersionSchema,
  PinItemTypeSchema,
  PinViewSchema,
  QuickSearchSchema,
  RemoveContactSchema,
  RemoveMetadataSchema,
  RemoveShareSchema,
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
  UpdateShareSchema,
  UpdateViewSchema,
  UploadBulkSchema,
  UploadDocumentSchema,
  ViewConditionSchema,
  ViewSortSchema,
} from "./schemas";
export type {
  AuditAction,
  AuditEntityType,
  CompressionMode,
  DocumentStatus,
  FieldType,
  GranteeType,
  PinItemType,
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
  PIN_ITEM_TYPE,
  SCHEDULED_JOBS,
  SETTING_KEYS,
  SHARE_PERMISSION,
} from "./utils/constants";

export type DmsModuleConfig = {
  allowedContentTypes?: string[];
  defaultAutoPurgeEveryHours?: number;
  defaultCompression?: CompressionOption;
  defaultDownloadLinkExpiry?: number;
  defaultRetentionDays?: number;
  maxDownloadLinkExpiry?: number;
  maxFileSize?: number;
  maxVersions?: number;
};

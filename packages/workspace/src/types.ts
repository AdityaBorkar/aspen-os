import type { WorkspaceDashboard } from "#/db-schemas/dashboard";
import type { WorkspaceDraft } from "#/db-schemas/draft";
import type { WorkspaceDraftComment } from "#/db-schemas/draft-comment";
import type { WorkspacePin } from "#/db-schemas/pin";
import type { WorkspaceRecent } from "#/db-schemas/recent";
import type { WorkspaceSchedule } from "#/db-schemas/schedule";
import type { WorkspaceWatch } from "#/db-schemas/watch";
import type { WorkspaceWidget } from "#/db-schemas/widget";

export type { WorkspaceDashboard, NewWorkspaceDashboard } from "#/db-schemas/dashboard";
export type { WorkspaceDraft, NewWorkspaceDraft } from "#/db-schemas/draft";
export type { WorkspaceDraftComment, NewWorkspaceDraftComment } from "#/db-schemas/draft-comment";
export type { WorkspacePin, NewWorkspacePin } from "#/db-schemas/pin";
export type { WorkspaceRecent, NewWorkspaceRecent } from "#/db-schemas/recent";
export type { WorkspaceSchedule, NewWorkspaceSchedule } from "#/db-schemas/schedule";
export type { WorkspaceWatch, NewWorkspaceWatch } from "#/db-schemas/watch";
export type { WorkspaceWidget, NewWorkspaceWidget } from "#/db-schemas/widget";
export type {
  DashboardCreatedEvent,
  DashboardDeletedEvent,
  DashboardDuplicatedEvent,
  DashboardEventMap,
  DashboardScheduledEvent,
  DashboardUnscheduledEvent,
  DashboardUpdatedEvent,
  DraftApprovedEvent,
  DraftCommentRemovedEvent,
  DraftCommentedEvent,
  DraftCreatedEvent,
  DraftDeletedEvent,
  DraftDuplicatedEvent,
  DraftEventMap,
  DraftPublishedEvent,
  DraftRejectedEvent,
  DraftReopenedEvent,
  DraftRestoredEvent,
  DraftSubmittedEvent,
  DraftTrashedEvent,
  DraftUpdatedEvent,
  PinCreatedEvent,
  PinEventMap,
  PinRemovedEvent,
  ScheduleDueEvent,
  ScheduleEventMap,
  WatchSubscribedEvent,
  WatchUnsubscribedEvent,
  WatchEventMap,
  WidgetAddedEvent,
  WidgetEventMap,
  WidgetRefreshedEvent,
  WidgetRemovedEvent,
  WidgetUpdatedEvent,
  WorkspaceEventMap,
} from "#/pubsub";
export {
  DASHBOARD_EVENTS,
  DRAFT_EVENTS,
  events,
  PIN_EVENTS,
  SCHEDULE_EVENTS,
  WATCH_EVENTS,
  WIDGET_EVENTS,
} from "#/pubsub";
export type {
  AddWidgetInput,
  BreakdownConfig,
  CreateDashboardInput,
  CreateDraftCommentInput,
  CreateDraftInput,
  CreateScheduleInput,
  DashboardExport,
  DashboardFilters,
  DashboardSnapshot,
  DraftFilters,
  EmbedConfig,
  ImportDashboardInput,
  ListConfig,
  ListDraftCommentsInput,
  ListPinsInput,
  ListRecentInput,
  ListWatchesInput,
  MarkRunScheduleInput,
  MetricConfig,
  MoveWidgetInput,
  PinItemInput,
  PublishDraftInput,
  QuickSearchInput,
  RefreshWidgetInput,
  RejectDraftInput,
  ScheduleConfig,
  ScheduleFilters,
  SubscribeWatchInput,
  TouchRecentInput,
  UnpinItemInput,
  UnsubscribeWatchInput,
  UpdateDashboardInput,
  UpdateDraftInput,
  UpdateScheduleInput,
  UpdateWidgetInput,
  WidgetConfig,
  WidgetFilters,
  WidgetPlacement,
  WidgetRange,
  WidgetSnapshot,
} from "#/schemas";
export {
  AddWidgetSchema,
  BreakdownConfigSchema,
  CreateDashboardSchema,
  CreateDraftCommentSchema,
  CreateDraftSchema,
  CreateScheduleSchema,
  DashboardExportSchema,
  DashboardFiltersSchema,
  DashboardSnapshotSchema,
  DomainSchema,
  DraftFiltersSchema,
  DraftStatusSchema,
  EmbedConfigSchema,
  EmbedKindSchema,
  ExportDashboardSchema,
  IdSchema,
  ImportDashboardSchema,
  JsonValueSchema,
  LimitSchema,
  ListConfigSchema,
  ListDraftCommentsSchema,
  ListPinsSchema,
  ListRecentSchema,
  ListWatchesSchema,
  MarkRunScheduleSchema,
  MetricConfigSchema,
  MoveWidgetSchema,
  NameSchema,
  OffsetSchema,
  PinItemInputSchema,
  PublishDraftSchema,
  QuickSearchSchema,
  RangePresetSchema,
  RefreshWidgetSchema,
  RejectDraftSchema,
  ScheduleConfigSchema,
  ScheduleFormatSchema,
  ScheduleFiltersSchema,
  SubscribeWatchSchema,
  TimezoneSchema,
  TitleSchema,
  TouchRecentSchema,
  UnpinItemSchema,
  UnsubscribeWatchSchema,
  UpdateDashboardSchema,
  UpdateDraftSchema,
  UpdateScheduleSchema,
  UpdateWidgetSchema,
  WidgetAggregationSchema,
  WidgetConfigSchema,
  WidgetFiltersSchema,
  WidgetPlacementSchema,
  WidgetRangeSchema,
  WidgetSnapshotSchema,
  WidgetTypeSchema,
  WithIdSchema,
  WorkspaceAccessSchema,
  WorkspaceItemTypeSchema,
} from "#/schemas";
export type { ScheduleDeps } from "#/services/schedule-service";
export {
  registerScheduleDelivery,
  registerScheduleHandler,
  registerScheduleRunner,
  scheduleCronTopic,
  unregisterScheduleHandler,
  unregisterScheduleRunner,
} from "#/services/schedule-service";
export type {
  AuditAction,
  AuditEntityType,
  DraftStatus,
  EmbedKind,
  PinItemType,
  RangePreset,
  ScheduleFormat,
  WidgetAggregation,
  WidgetType,
  WorkspaceAccess,
  WorkspaceItemType,
} from "#/utils/constants";
export {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  DRAFT_STATUS,
  EMBED_KIND,
  PIN_ITEM_TYPE,
  RANGE_PRESET,
  SCHEDULE_CRON_TOPIC_PREFIX,
  SCHEDULE_FORMAT,
  WIDGET_AGGREGATION,
  WIDGET_TYPE,
  WORKSPACE_ACCESS,
  WORKSPACE_ITEM_TYPE,
} from "#/utils/constants";
export type { WorkspaceRuntimeConfig } from "#/runtime";
export { getWorkspaceConfig, setWorkspaceConfig } from "#/runtime";

export type WorkspaceDashboardRow = WorkspaceDashboard;
export type WorkspaceDraftRow = WorkspaceDraft;
export type WorkspaceDraftCommentRow = WorkspaceDraftComment;
export type WorkspaceWidgetRow = WorkspaceWidget;
export type WorkspaceScheduleRow = WorkspaceSchedule;
export type WorkspacePinRow = WorkspacePin;
export type WorkspaceRecentRow = WorkspaceRecent;
export type WorkspaceWatchRow = WorkspaceWatch;

export interface WorkspaceModuleConfig {
  maxRecentItems?: number;
  quickSearchLimit?: number;
}

export interface QuickSearchResult {
  dashboards: {
    access: string;
    id: string;
    name: string;
  }[];
  drafts: {
    access: string;
    id: string;
    status: string;
    title: string;
  }[];
}

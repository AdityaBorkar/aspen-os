import type { WorkspaceDashboard } from "#/db-schemas/dashboard";
import type { WorkspaceDraft } from "#/db-schemas/draft";
import type { WorkspaceDraftComment } from "#/db-schemas/draft-comment";
import type { WorkspacePin } from "#/db-schemas/pin";
import type { WorkspaceRecent } from "#/db-schemas/recent";
import type { WorkspaceSchedule } from "#/db-schemas/schedule";
import type { WorkspaceSetting } from "#/db-schemas/setting";
import type { WorkspaceView } from "#/db-schemas/view";
import type { WorkspaceWatch } from "#/db-schemas/watch";
import type { WorkspaceWidget } from "#/db-schemas/widget";

export type { WorkspaceDashboard, NewWorkspaceDashboard } from "#/db-schemas/dashboard";
export type { WorkspaceDraft, NewWorkspaceDraft } from "#/db-schemas/draft";
export type { WorkspaceDraftComment, NewWorkspaceDraftComment } from "#/db-schemas/draft-comment";
export type { WorkspacePin, NewWorkspacePin } from "#/db-schemas/pin";
export type { WorkspaceRecent, NewWorkspaceRecent } from "#/db-schemas/recent";
export type { WorkspaceSchedule, NewWorkspaceSchedule } from "#/db-schemas/schedule";
export type { WorkspaceSetting, NewWorkspaceSetting } from "#/db-schemas/setting";
export type { WorkspaceView, NewWorkspaceView } from "#/db-schemas/view";
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
  ViewCreatedEvent,
  ViewDeletedEvent,
  ViewDuplicatedEvent,
  ViewEventMap,
  ViewUpdatedEvent,
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
  VIEW_EVENTS,
  WATCH_EVENTS,
  WIDGET_EVENTS,
} from "#/pubsub";
export type {
  ApplyViewInput,
  AddWidgetInput,
  BreakdownConfig,
  CreateDashboardInput,
  CreateDraftCommentInput,
  CreateDraftInput,
  CreateScheduleInput,
  CreateViewInput,
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
  UpdateViewInput,
  UpdateWidgetInput,
  ViewCondition,
  ViewFilters,
  ViewSort,
  WidgetConfig,
  WidgetFilters,
  WidgetPlacement,
  WidgetRange,
  WidgetSnapshot,
} from "#/schemas";
export {
  AddWidgetSchema,
  ApplyViewSchema,
  BreakdownConfigSchema,
  CreateDashboardSchema,
  CreateDraftCommentSchema,
  CreateDraftSchema,
  CreateScheduleSchema,
  CreateViewSchema,
  DashboardExportSchema,
  DashboardFiltersSchema,
  DashboardSnapshotSchema,
  DomainSchema,
  DraftFiltersSchema,
  DraftStatusSchema,
  EmbedConfigSchema,
  EmbedKindSchema,
  ExportDashboardSchema,
  GetSettingSchema,
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
  SetSettingSchema,
  SubscribeWatchSchema,
  TimezoneSchema,
  TitleSchema,
  TouchRecentSchema,
  UnpinItemSchema,
  UnsubscribeWatchSchema,
  UpdateDashboardSchema,
  UpdateDraftSchema,
  UpdateScheduleSchema,
  UpdateViewSchema,
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
  ViewConditionSchema,
  ViewFiltersSchema,
  ViewSortSchema,
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
  RangePreset,
  ScheduleFormat,
  SettingKey,
  ViewDomain,
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
  RANGE_PRESET,
  SCHEDULE_CRON_TOPIC_PREFIX,
  SCHEDULE_FORMAT,
  SETTING_KEYS,
  VIEW_DOMAIN,
  WIDGET_AGGREGATION,
  WIDGET_TYPE,
  WORKSPACE_ACCESS,
  WORKSPACE_ITEM_TYPE,
} from "#/utils/constants";
export type {
  ViewResolver,
  ViewResolverOptions,
  ViewResolverResult,
  WorkspaceRuntimeConfig,
} from "#/runtime";
export {
  getViewResolver,
  getWorkspaceConfig,
  hasViewResolver,
  registerViewResolver,
  setWorkspaceConfig,
} from "#/runtime";

export type WorkspaceDashboardRow = WorkspaceDashboard;
export type WorkspaceDraftRow = WorkspaceDraft;
export type WorkspaceDraftCommentRow = WorkspaceDraftComment;
export type WorkspaceViewRow = WorkspaceView;
export type WorkspaceWidgetRow = WorkspaceWidget;
export type WorkspaceScheduleRow = WorkspaceSchedule;
export type WorkspacePinRow = WorkspacePin;
export type WorkspaceRecentRow = WorkspaceRecent;
export type WorkspaceWatchRow = WorkspaceWatch;
export type WorkspaceSettingRow = WorkspaceSetting;

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
  views: {
    access: string;
    domain: string;
    id: string;
    name: string;
  }[];
}

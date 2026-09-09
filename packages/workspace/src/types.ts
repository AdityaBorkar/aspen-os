import type { WorkspaceDashboard } from "#/db-schemas/dashboard";
import type { WorkspaceDraft } from "#/db-schemas/draft";
import type { WorkspaceDraftComment } from "#/db-schemas/draft-comment";
import type { WorkspacePin } from "#/db-schemas/pin";
import type { WorkspaceRecent } from "#/db-schemas/recent";
import type { WorkspaceSchedule } from "#/db-schemas/schedule";
import type { WorkspaceWidget } from "#/db-schemas/widget";

export type { WorkspaceDashboard, NewWorkspaceDashboard } from "#/db-schemas/dashboard";
export type { WorkspaceDraft, NewWorkspaceDraft } from "#/db-schemas/draft";
export type { WorkspaceDraftComment, NewWorkspaceDraftComment } from "#/db-schemas/draft-comment";
export type { WorkspaceFilterView, NewWorkspaceFilterView } from "#/db-schemas/filter-view";
export type { WorkspacePin, NewWorkspacePin } from "#/db-schemas/pin";
export type { WorkspaceRecent, NewWorkspaceRecent } from "#/db-schemas/recent";
export type {
  WorkspaceDeliverySchedule,
  NewWorkspaceDeliverySchedule,
  WorkspaceSchedule,
  NewWorkspaceSchedule,
} from "#/db-schemas/schedule";
export type { WorkspaceWidget, NewWorkspaceWidget } from "#/db-schemas/widget";
export type {
  DashboardCreatedEvent,
  DashboardDeletedEvent,
  DashboardDuplicatedEvent,
  DashboardEventMap,
  DashboardScheduledEvent,
  DashboardUnscheduledEvent,
  DashboardUpdatedEvent,
  DeliveryScheduleDueEvent,
  DeliveryScheduleEventMap,
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
  FilterViewCreatedEvent,
  FilterViewDeletedEvent,
  FilterViewDuplicatedEvent,
  FilterViewEventMap,
  FilterViewUpdatedEvent,
  PinCreatedEvent,
  PinEventMap,
  PinRemovedEvent,
  WidgetAddedEvent,
  WidgetEventMap,
  WidgetRefreshedEvent,
  WidgetRemovedEvent,
  WidgetUpdatedEvent,
  WorkspaceEventMap,
} from "#/pubsub";
export {
  DASHBOARD_EVENTS,
  DELIVERY_SCHEDULE_EVENTS,
  DRAFT_EVENTS,
  events,
  FILTER_VIEW_EVENTS,
  PIN_EVENTS,
  WIDGET_EVENTS,
} from "#/pubsub";
export type {
  AddWidgetInput,
  BreakdownConfig,
  CreateDashboardInput,
  CreateDraftCommentInput,
  CreateDraftInput,
  CreateFilterViewInput,
  CreateScheduleInput,
  DashboardExport,
  DashboardFilters,
  DashboardSnapshot,
  DraftFilters,
  EmbedConfig,
  FilterViewCondition,
  FilterViewFilters,
  FilterViewSort,
  GetDefaultFilterViewInput,
  ImportDashboardInput,
  ListConfig,
  ListDraftCommentsInput,
  ListPinsInput,
  ListRecentInput,
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
  TouchRecentInput,
  UnpinItemInput,
  UpdateDashboardInput,
  UpdateDraftInput,
  UpdateFilterViewInput,
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
  CreateFilterViewSchema,
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
  FilterViewConditionSchema,
  FilterViewDomainSchema,
  FilterViewFiltersSchema,
  FilterViewSortSchema,
  GetDefaultFilterViewSchema,
  IdSchema,
  ImportDashboardSchema,
  JsonValueSchema,
  LimitSchema,
  ListConfigSchema,
  ListDraftCommentsSchema,
  ListPinsSchema,
  ListRecentSchema,
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
  TimezoneSchema,
  TitleSchema,
  TouchRecentSchema,
  UnpinItemSchema,
  UpdateDashboardSchema,
  UpdateDraftSchema,
  UpdateFilterViewSchema,
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
  deliverDueSchedule,
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
  FilterViewAccess,
  FilterViewDomain,
  FilterViewType,
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
  DELIVERY_SCHEDULE_CRON_TOPIC_PREFIX,
  DRAFT_STATUS,
  EMBED_KIND,
  FILTER_VIEW_ACCESS,
  FILTER_VIEW_DOMAIN,
  FILTER_VIEW_TYPE,
  PIN_ITEM_TYPE,
  RANGE_PRESET,
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

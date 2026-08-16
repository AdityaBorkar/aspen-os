import type { WorkspaceDashboard, WorkspaceDraft, WorkspaceSchedule } from "#/types";

import type { JsonValue } from "@aspen-os/platform/server";

export const DRAFT_EVENTS = {
  APPROVED: "workspace:draft_approved",
  COMMENTED: "workspace:draft_commented",
  COMMENT_REMOVED: "workspace:draft_comment_removed",
  CREATED: "workspace:draft_created",
  DELETED: "workspace:draft_deleted",
  DUPLICATED: "workspace:draft_duplicated",
  PUBLISHED: "workspace:draft_published",
  REJECTED: "workspace:draft_rejected",
  REOPENED: "workspace:draft_reopened",
  RESTORED: "workspace:draft_restored",
  SUBMITTED: "workspace:draft_submitted",
  TRASHED: "workspace:draft_trashed",
  UPDATED: "workspace:draft_updated",
} as const;

export const VIEW_EVENTS = {
  CREATED: "workspace:view_created",
  DELETED: "workspace:view_deleted",
  DUPLICATED: "workspace:view_duplicated",
  UPDATED: "workspace:view_updated",
} as const;

export const DASHBOARD_EVENTS = {
  CREATED: "workspace:dashboard_created",
  DELETED: "workspace:dashboard_deleted",
  DUPLICATED: "workspace:dashboard_duplicated",
  SCHEDULED: "workspace:dashboard_scheduled",
  UNSCHEDULED: "workspace:dashboard_unscheduled",
  UPDATED: "workspace:dashboard_updated",
} as const;

export const WIDGET_EVENTS = {
  ADDED: "workspace:widget_added",
  REFRESHED: "workspace:widget_refreshed",
  REMOVED: "workspace:widget_removed",
  UPDATED: "workspace:widget_updated",
} as const;

export const PIN_EVENTS = {
  CREATED: "workspace:pin_created",
  REMOVED: "workspace:pin_removed",
} as const;

export const WATCH_EVENTS = {
  SUBSCRIBED: "workspace:watch_subscribed",
  UNSUBSCRIBED: "workspace:watch_unsubscribed",
} as const;

export const SCHEDULE_EVENTS = {
  DUE: "workspace:schedule_due",
} as const;

export const events = {
  DASHBOARD_EVENTS,
  DRAFT_EVENTS,
  PIN_EVENTS,
  SCHEDULE_EVENTS,
  VIEW_EVENTS,
  WATCH_EVENTS,
  WIDGET_EVENTS,
};

export interface DraftCreatedEvent {
  access: string;
  draftId: string;
  ownerId: string;
}

export interface DraftUpdatedEvent {
  changes: Record<string, JsonValue>;
  draftId: string;
}

export interface DraftSubmittedEvent {
  draftId: string;
  submittedBy: string;
}

export interface DraftApprovedEvent {
  approvedBy: string;
  draftId: string;
}

export interface DraftRejectedEvent {
  draftId: string;
  rejectedBy: string;
  rejectionReason: string;
}

export interface DraftPublishedEvent {
  draft: WorkspaceDraft;
}

export interface DraftReopenedEvent {
  draftId: string;
}

export interface DraftTrashedEvent {
  draftId: string;
}

export interface DraftRestoredEvent {
  draftId: string;
}

export interface DraftDuplicatedEvent {
  draftId: string;
  duplicateId: string;
}

export interface DraftCommentedEvent {
  authorId: string;
  commentId: string;
  draftId: string;
}

export interface DraftCommentRemovedEvent {
  commentId: string;
  draftId: string;
}

export interface DraftDeletedEvent {
  draftId: string;
}

export interface ViewCreatedEvent {
  access: string;
  domain: string;
  ownerId: string;
  viewId: string;
}

export interface ViewUpdatedEvent {
  viewId: string;
}

export interface ViewDuplicatedEvent {
  duplicateId: string;
  viewId: string;
}

export interface ViewDeletedEvent {
  viewId: string;
}

export interface DashboardCreatedEvent {
  access: string;
  dashboardId: string;
  ownerId: string;
}

export interface DashboardUpdatedEvent {
  dashboardId: string;
}

export interface DashboardDuplicatedEvent {
  dashboardId: string;
  duplicateId: string;
}

export interface DashboardScheduledEvent {
  dashboardId: string;
  scheduleId: string;
}

export interface DashboardUnscheduledEvent {
  dashboardId: string;
  scheduleId: string;
}

export interface DashboardDeletedEvent {
  dashboardId: string;
}

export interface WidgetAddedEvent {
  dashboardId: string;
  widgetId: string;
}

export interface WidgetUpdatedEvent {
  dashboardId: string;
  widgetId: string;
}

export interface WidgetRefreshedEvent {
  error: string | null;
  widgetId: string;
}

export interface WidgetRemovedEvent {
  dashboardId: string;
  widgetId: string;
}

export interface PinCreatedEvent {
  itemId: string;
  itemType: string;
  userId: string;
}

export interface PinRemovedEvent {
  itemId: string;
  itemType: string;
  userId: string;
}

export interface WatchSubscribedEvent {
  itemId: string;
  itemType: string;
  userId: string;
}

export interface WatchUnsubscribedEvent {
  itemId: string;
  itemType: string;
  userId: string;
}

export interface ScheduleDueEvent {
  at: string;
  dashboard: WorkspaceDashboard;
  schedule: WorkspaceSchedule;
}

export interface DraftEventMap {
  [DRAFT_EVENTS.APPROVED]: DraftApprovedEvent;
  [DRAFT_EVENTS.COMMENT_REMOVED]: DraftCommentRemovedEvent;
  [DRAFT_EVENTS.COMMENTED]: DraftCommentedEvent;
  [DRAFT_EVENTS.CREATED]: DraftCreatedEvent;
  [DRAFT_EVENTS.DELETED]: DraftDeletedEvent;
  [DRAFT_EVENTS.DUPLICATED]: DraftDuplicatedEvent;
  [DRAFT_EVENTS.PUBLISHED]: DraftPublishedEvent;
  [DRAFT_EVENTS.REJECTED]: DraftRejectedEvent;
  [DRAFT_EVENTS.REOPENED]: DraftReopenedEvent;
  [DRAFT_EVENTS.RESTORED]: DraftRestoredEvent;
  [DRAFT_EVENTS.SUBMITTED]: DraftSubmittedEvent;
  [DRAFT_EVENTS.TRASHED]: DraftTrashedEvent;
  [DRAFT_EVENTS.UPDATED]: DraftUpdatedEvent;
}

export interface ViewEventMap {
  [VIEW_EVENTS.CREATED]: ViewCreatedEvent;
  [VIEW_EVENTS.DELETED]: ViewDeletedEvent;
  [VIEW_EVENTS.DUPLICATED]: ViewDuplicatedEvent;
  [VIEW_EVENTS.UPDATED]: ViewUpdatedEvent;
}

export interface DashboardEventMap {
  [DASHBOARD_EVENTS.CREATED]: DashboardCreatedEvent;
  [DASHBOARD_EVENTS.DELETED]: DashboardDeletedEvent;
  [DASHBOARD_EVENTS.DUPLICATED]: DashboardDuplicatedEvent;
  [DASHBOARD_EVENTS.SCHEDULED]: DashboardScheduledEvent;
  [DASHBOARD_EVENTS.UNSCHEDULED]: DashboardUnscheduledEvent;
  [DASHBOARD_EVENTS.UPDATED]: DashboardUpdatedEvent;
}

export interface WidgetEventMap {
  [WIDGET_EVENTS.ADDED]: WidgetAddedEvent;
  [WIDGET_EVENTS.REFRESHED]: WidgetRefreshedEvent;
  [WIDGET_EVENTS.REMOVED]: WidgetRemovedEvent;
  [WIDGET_EVENTS.UPDATED]: WidgetUpdatedEvent;
}

export interface PinEventMap {
  [PIN_EVENTS.CREATED]: PinCreatedEvent;
  [PIN_EVENTS.REMOVED]: PinRemovedEvent;
}

export interface WatchEventMap {
  [WATCH_EVENTS.SUBSCRIBED]: WatchSubscribedEvent;
  [WATCH_EVENTS.UNSUBSCRIBED]: WatchUnsubscribedEvent;
}

export interface ScheduleEventMap {
  [SCHEDULE_EVENTS.DUE]: ScheduleDueEvent;
}

export type WorkspaceEventMap = DashboardEventMap &
  DraftEventMap &
  PinEventMap &
  ScheduleEventMap &
  ViewEventMap &
  WatchEventMap &
  WidgetEventMap;

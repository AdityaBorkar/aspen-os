import type { JsonValue } from "@aspen-os/platform/server";

// ─── Announcement Events ─────────────────────────────────────────────────

export const ANNOUNCEMENT_EVENTS = {
  ARCHIVED: "announcement.archived",
  CREATED: "announcement.created",
  PINNED: "announcement.pinned",
  PUBLISHED: "announcement.published",
  SCHEDULED: "announcement.scheduled",
  UPDATED: "announcement.updated",
} as const;

export interface AnnouncementCreatedEvent {
  announcement: {
    id: string;
    status: string;
    title: string;
  };
}

export interface AnnouncementUpdatedEvent {
  announcement: { id: string };
  changes: Record<string, JsonValue>;
}

export interface AnnouncementScheduledEvent {
  announcementId: string;
  scheduledFor: string;
}

export interface AnnouncementPublishedEvent {
  announcement: { id: string; title: string };
  recipientUserIds: string[];
  /**
   * Tenant database name at publish time (`ctx.tenantId`). The comms event
   * bridge runs in the `$global` scope, so it needs this to resolve the
   * tenant DB for per-user fan-out.
   */
  tenantId: string;
}

export interface AnnouncementArchivedEvent {
  announcementId: string;
}

export interface AnnouncementPinnedEvent {
  announcementId: string;
  pinned: boolean;
  pinnedBy: string;
}

// ─── Event Maps ───────────────────────────────────────────────────────────

export interface AnnouncementEventMap {
  [ANNOUNCEMENT_EVENTS.ARCHIVED]: AnnouncementArchivedEvent;
  [ANNOUNCEMENT_EVENTS.CREATED]: AnnouncementCreatedEvent;
  [ANNOUNCEMENT_EVENTS.PINNED]: AnnouncementPinnedEvent;
  [ANNOUNCEMENT_EVENTS.PUBLISHED]: AnnouncementPublishedEvent;
  [ANNOUNCEMENT_EVENTS.SCHEDULED]: AnnouncementScheduledEvent;
  [ANNOUNCEMENT_EVENTS.UPDATED]: AnnouncementUpdatedEvent;
}

export const events = {
  announcement: ANNOUNCEMENT_EVENTS,
};

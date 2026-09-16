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

export type HrAnnouncementEventMap = AnnouncementEventMap;

export const events = {
  announcement: ANNOUNCEMENT_EVENTS,
};

import {
  announcementChannelEnum,
  announcementPriorityEnum,
  announcementStatusEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type AnnouncementAudienceType =
  | "all"
  | "hr_users"
  | "employees"
  | "branches"
  | "departments"
  | "designations"
  | "groups"
  | "roles"
  | "individuals";

export interface AnnouncementAudience {
  ids?: string[];
  type: AnnouncementAudienceType;
}

export const hrAnnouncement = pgTable(
  "hr_announcement",
  {
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    audience: jsonb("audience").$type<AnnouncementAudience | null>(),
    author: text("author").notNull(),
    body: text("body").notNull(),
    channel: announcementChannelEnum("channel").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuidv7("id").primaryKey(),
    isPinned: boolean("is_pinned").notNull().default(false),
    pinnedBy: text("pinned_by"),
    priority: announcementPriorityEnum("priority").notNull().default("normal"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    requireAcknowledgement: boolean("require_acknowledgement").notNull().default(false),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    status: announcementStatusEnum("status").notNull().default("draft"),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_hr_announcement_status").on(table.status),
    index("idx_hr_announcement_author").on(table.author),
    index("idx_hr_announcement_scheduled_for").on(table.scheduledFor),
  ],
);

export const hrAnnouncementRecipient = pgTable(
  "hr_announcement_recipient",
  {
    announcementId: text("announcement_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    employeeId: text("employee_id"),
    hrUserId: text("hr_user_id"),
    id: uuidv7("id").primaryKey(),
    userId: text("user_id"),
  },
  (table) => [
    index("idx_hr_announcement_recipient_announcement_id").on(table.announcementId),
    index("idx_hr_announcement_recipient_user_id").on(table.userId),
  ],
);

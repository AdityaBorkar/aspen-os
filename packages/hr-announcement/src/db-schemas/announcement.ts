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
    archived_at: timestamp({ withTimezone: true }),
    audience: jsonb().$type<AnnouncementAudience | null>(),
    author: text().notNull(),
    body: text().notNull(),
    channel: announcementChannelEnum().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    pinned: boolean().notNull().default(false),
    pinned_by: text(),
    priority: announcementPriorityEnum().notNull().default("normal"),
    published_at: timestamp({ withTimezone: true }),
    require_acknowledgement: boolean().notNull().default(false),
    scheduled_for: timestamp({ withTimezone: true }),
    status: announcementStatusEnum().notNull().default("draft"),
    title: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_hr_announcement_status").on(table.status),
    index("idx_hr_announcement_author").on(table.author),
    index("idx_hr_announcement_scheduled_for").on(table.scheduled_for),
  ],
);

export const hrAnnouncementRecipient = pgTable(
  "hr_announcement_recipient",
  {
    announcement_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    employee_id: text(),
    hr_user_id: text(),
    id: uuidv7().primaryKey(),
    user_id: text(),
  },
  (table) => [
    index("idx_hr_announcement_recipient_announcement_id").on(table.announcement_id),
    index("idx_hr_announcement_recipient_user_id").on(table.user_id),
  ],
);

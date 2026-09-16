import { NOTIFICATION_SEVERITY } from "@aspen-os/constants";
import { pgEnum } from "drizzle-orm/pg-core";

export const announcementStatusEnum = pgEnum("hr_announcement_status", [
  "archived",
  "draft",
  "published",
  "scheduled",
]);

export const announcementChannelEnum = pgEnum("hr_announcement_channel", [
  "custom",
  "general",
  "hr",
]);

export const announcementPriorityEnum = pgEnum("hr_announcement_priority", [
  NOTIFICATION_SEVERITY.IMPORTANT,
  NOTIFICATION_SEVERITY.NORMAL,
  NOTIFICATION_SEVERITY.URGENT,
]);

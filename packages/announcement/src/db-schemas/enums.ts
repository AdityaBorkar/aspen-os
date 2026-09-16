import { NOTIFICATION_SEVERITY } from "@aspen-os/constants";
import { pgEnum } from "drizzle-orm/pg-core";

export const announcementStatusEnum = pgEnum("announcement_status", [
  "archived",
  "draft",
  "published",
  "scheduled",
]);

export const announcementPriorityEnum = pgEnum("announcement_priority", [
  NOTIFICATION_SEVERITY.IMPORTANT,
  NOTIFICATION_SEVERITY.NORMAL,
  NOTIFICATION_SEVERITY.URGENT,
]);

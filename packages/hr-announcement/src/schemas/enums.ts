import { enum as enum_ } from "valibot";

export const AnnouncementStatusSchema = enum_({
  archived: "archived",
  draft: "draft",
  published: "published",
  scheduled: "scheduled",
});

export const AnnouncementChannelSchema = enum_({
  custom: "custom",
  general: "general",
  hr: "hr",
});

export const AnnouncementPrioritySchema = enum_({
  important: "important",
  normal: "normal",
  urgent: "urgent",
});

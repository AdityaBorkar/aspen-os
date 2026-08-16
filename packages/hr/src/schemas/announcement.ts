import {
  AnnouncementChannelSchema,
  AnnouncementPrioritySchema,
  AnnouncementStatusSchema,
} from "#/schemas/enums";

import {
  array,
  boolean,
  enum as enum_,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const AnnouncementAudienceSchema = object({
  ids: optional(array(string())),
  type: enum_({
    all: "all",
    branches: "branches",
    departments: "departments",
    designations: "designations",
    employees: "employees",
    groups: "groups",
    hr_users: "hr_users",
    individuals: "individuals",
    roles: "roles",
  }),
});

export type AnnouncementAudienceInput = InferOutput<typeof AnnouncementAudienceSchema>;

export const CreateAnnouncementSchema = object({
  audience: optional(nullable(AnnouncementAudienceSchema)),
  body: pipe(string(), minLength(1, "Body is required")),
  channel: AnnouncementChannelSchema,
  priority: optional(AnnouncementPrioritySchema, "normal"),
  requireAcknowledgement: optional(boolean(), false),
  scheduleAt: optional(string()),
  title: pipe(string(), minLength(1, "Title is required")),
});

export type CreateAnnouncementInput = InferOutput<typeof CreateAnnouncementSchema>;

export const UpdateAnnouncementSchema = object({
  audience: optional(nullable(AnnouncementAudienceSchema)),
  body: optional(string()),
  channel: optional(AnnouncementChannelSchema),
  priority: optional(AnnouncementPrioritySchema),
  requireAcknowledgement: optional(boolean()),
  title: optional(string()),
});

export type UpdateAnnouncementInput = InferOutput<typeof UpdateAnnouncementSchema>;

// oxlint-disable eslint/id-length
export const AnnouncementFiltersSchema = object({
  author: optional(string()),
  channel: optional(AnnouncementChannelSchema),
  fromDate: optional(string()),
  isPinned: optional(boolean()),
  priority: optional(AnnouncementPrioritySchema),
  q: optional(string()),
  status: optional(AnnouncementStatusSchema),
  toDate: optional(string()),
});
// oxlint-enable eslint/id-length

export type AnnouncementFilters = InferOutput<typeof AnnouncementFiltersSchema>;

export const RecipientListFiltersSchema = object({
  deliveredOnly: optional(boolean()),
  limit: optional(number(), 50),
  offset: optional(number(), 0),
});

export type RecipientListFilters = InferOutput<typeof RecipientListFiltersSchema>;

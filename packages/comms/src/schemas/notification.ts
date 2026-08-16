import {
  NotificationSeveritySchema,
  NotificationStatusSchema,
  RecipientTypeSchema,
  NotificationChannelTypeSchema,
} from "#/schemas/enums";
import { MetadataSchema } from "#/schemas/json";
import { IdSchema } from "#/schemas/utils";

import { array, boolean, integer, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const RecipientSchema = object({
  email: optional(string()),
  id: IdSchema,
  name: optional(string()),
  phone: optional(string()),
  type: RecipientTypeSchema,
});

export type Recipient = InferOutput<typeof RecipientSchema>;

export const NotifySchema = object({
  body: optional(string()),
  channelTypes: optional(array(NotificationChannelTypeSchema)),
  metadata: optional(nullable(MetadataSchema)),
  recipient: RecipientSchema,
  severity: optional(NotificationSeveritySchema),
  sourceEntity: optional(
    object({
      id: string(),
      type: string(),
    }),
  ),
  sourceModule: optional(string()),
  templateId: optional(IdSchema),
  title: string(),
  type: string(),
});

export type NotifyInput = InferOutput<typeof NotifySchema>;

export const InboxFiltersSchema = object({
  fromDate: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  severity: optional(NotificationSeveritySchema),
  toDate: optional(string()),
  type: optional(string()),
  unreadOnly: optional(boolean()),
});

export type InboxFilters = InferOutput<typeof InboxFiltersSchema>;

export const GetInboxSchema = object({
  filters: optional(InboxFiltersSchema),
});

export type GetInboxInput = InferOutput<typeof GetInboxSchema>;

export const NotificationFiltersSchema = object({
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  recipientId: optional(string()),
  recipientType: optional(RecipientTypeSchema),
  severity: optional(NotificationSeveritySchema),
  status: optional(NotificationStatusSchema),
  type: optional(string()),
});

export type NotificationFilters = InferOutput<typeof NotificationFiltersSchema>;

export const ListNotificationsSchema = object({
  filters: optional(NotificationFiltersSchema),
});

export type ListNotificationsInput = InferOutput<typeof ListNotificationsSchema>;

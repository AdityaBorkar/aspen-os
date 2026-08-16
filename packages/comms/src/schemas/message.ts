import { ChannelTypeSchema, MessageStatusSchema } from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import { integer, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const MessageFiltersSchema = object({
  channelId: optional(string()),
  channelType: optional(ChannelTypeSchema),
  limit: optional(pipe(number(), integer())),
  notificationId: optional(string()),
  offset: optional(pipe(number(), integer())),
  status: optional(MessageStatusSchema),
});

export type MessageFilters = InferOutput<typeof MessageFiltersSchema>;

export const ListMessagesSchema = object({
  filters: optional(MessageFiltersSchema),
});

export type ListMessagesInput = InferOutput<typeof ListMessagesSchema>;

export const RetryMessageSchema = object({
  id: IdSchema,
});

export type RetryMessageInput = InferOutput<typeof RetryMessageSchema>;

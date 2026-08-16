import {
  ReminderChannelSchema,
  ReminderIntervalSchema,
  ReminderTargetSchema,
  ReminderTypeSchema,
} from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import { boolean, date, integer, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateReminderSchema = object({
  channel: optional(ReminderChannelSchema, "pubsub"),
  interval: optional(nullable(ReminderIntervalSchema)),
  isRecurring: optional(boolean(), false),
  message: optional(nullable(string())),
  offsetMinutes: optional(nullable(pipe(number(), integer()))),
  remindAt: optional(nullable(date())),
  targetId: optional(nullable(string())),
  targetType: ReminderTargetSchema,
  type: ReminderTypeSchema,
  userId: IdSchema,
});

export type CreateReminderInput = InferOutput<typeof CreateReminderSchema>;

export const UpdateReminderSchema = object({
  channel: optional(ReminderChannelSchema),
  interval: optional(nullable(ReminderIntervalSchema)),
  isRecurring: optional(boolean()),
  message: optional(nullable(string())),
  offsetMinutes: optional(nullable(pipe(number(), integer()))),
  remindAt: optional(nullable(date())),
});

export type UpdateReminderInput = InferOutput<typeof UpdateReminderSchema>;

export const ReminderFiltersSchema = object({
  isSent: optional(boolean()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  targetId: optional(string()),
  targetType: optional(ReminderTargetSchema),
  type: optional(ReminderTypeSchema),
  userId: optional(string()),
});

export type ReminderFilters = InferOutput<typeof ReminderFiltersSchema>;

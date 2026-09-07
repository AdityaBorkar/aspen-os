import {
  ReminderChannelSchema,
  ReminderIntervalSchema,
  ReminderTargetSchema,
  ReminderTypeSchema,
} from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";
import { REMINDER_TARGET } from "#/utils/constants";
import type { ReminderTarget } from "#/utils/constants";

import {
  boolean,
  date,
  integer,
  literal,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
  variant,
} from "valibot";
import type { InferOutput } from "valibot";

/** Target types that must reference an existing row via `targetId`. */
export const TARGETS_REQUIRING_ID: ReadonlySet<ReminderTarget> = new Set([
  REMINDER_TARGET.EVENT,
  REMINDER_TARGET.FILE,
  REMINDER_TARGET.NOTE,
  REMINDER_TARGET.TASK,
]);

const ReminderBaseSchema = object({
  channel: optional(ReminderChannelSchema, "pubsub"),
  interval: optional(nullable(ReminderIntervalSchema)),
  isRecurring: optional(boolean(), false),
  message: optional(nullable(string())),
  targetId: optional(nullable(string())),
  targetType: ReminderTargetSchema,
  userId: IdSchema,
});

const OffsetReminderSchema = object({
  ...ReminderBaseSchema.entries,
  offsetMinutes: pipe(number(), integer()),
  remindAt: optional(nullable(date())),
  type: literal("offset"),
});

function anchoredReminderSchema<TType extends "custom" | "due_date" | "overdue">(type: TType) {
  return object({
    ...ReminderBaseSchema.entries,
    offsetMinutes: optional(nullable(pipe(number(), integer()))),
    remindAt: date(),
    type: literal(type),
  });
}

/**
 * Discriminated union on `type`, so invalid states are unrepresentable:
 * `offset` requires `offsetMinutes` (its anchor resolves from the target or
 * the caller-supplied `remindAt`); every other type requires `remindAt`.
 */
export const CreateReminderSchema = variant("type", [
  OffsetReminderSchema,
  anchoredReminderSchema("custom"),
  anchoredReminderSchema("due_date"),
  anchoredReminderSchema("overdue"),
]);

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

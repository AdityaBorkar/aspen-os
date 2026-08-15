import { ReminderTypeSchema } from "#/schemas/enums";

import { boolean, date, minLength, nullable, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateReminderSchema = object({
  interval: optional(nullable(string())),
  isRecurring: optional(boolean()),
  message: optional(nullable(string())),
  remindAt: date(),
  taskId: pipe(string(), minLength(1, "taskId is required")),
  type: ReminderTypeSchema,
  userId: pipe(string(), minLength(1, "userId is required")),
});

export type CreateReminderInput = InferOutput<typeof CreateReminderSchema>;

export const UpdateReminderSchema = object({
  interval: optional(nullable(string())),
  isRecurring: optional(boolean()),
  isSent: optional(boolean()),
  message: optional(nullable(string())),
  remindAt: optional(date()),
});

export type UpdateReminderInput = InferOutput<typeof UpdateReminderSchema>;

export const ReminderFiltersSchema = object({
  isSent: optional(boolean()),
  taskId: optional(string()),
  type: optional(ReminderTypeSchema),
  userId: optional(string()),
});

export type ReminderFilters = InferOutput<typeof ReminderFiltersSchema>;

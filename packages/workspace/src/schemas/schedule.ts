import { ScheduleFormatSchema } from "#/schemas/enums";

import { array, boolean, integer, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const ScheduleConfigSchema = object({
  format: ScheduleFormatSchema,
  recipients: array(string()),
  subject: optional(nullable(string())),
});

export type ScheduleConfig = InferOutput<typeof ScheduleConfigSchema>;

export const CreateScheduleSchema = object({
  config: ScheduleConfigSchema,
  cron: string(),
  dashboardId: string(),
  isActive: optional(boolean(), true),
});

export type CreateScheduleInput = InferOutput<typeof CreateScheduleSchema>;

export const UpdateScheduleSchema = object({
  config: optional(ScheduleConfigSchema),
  cron: optional(string()),
  isActive: optional(boolean()),
});

export type UpdateScheduleInput = InferOutput<typeof UpdateScheduleSchema>;

export const ScheduleFiltersSchema = object({
  dashboardId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

export type ScheduleFilters = InferOutput<typeof ScheduleFiltersSchema>;

export const MarkRunScheduleSchema = object({
  at: optional(nullable(string())),
  error: optional(nullable(string())),
  id: string(),
});

export type MarkRunScheduleInput = InferOutput<typeof MarkRunScheduleSchema>;

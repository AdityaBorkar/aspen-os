import { CalendarAccessSchema } from "#/schemas/enums";
import { NameSchema, TimezoneSchema } from "#/schemas/utils";

import { boolean, integer, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateCalendarSchema = object({
  access: optional(CalendarAccessSchema, "personal"),
  color: optional(nullable(string())),
  description: optional(nullable(string())),
  isDefault: optional(boolean()),
  name: NameSchema,
  timezone: optional(string(), "UTC"),
});

export type CreateCalendarInput = InferOutput<typeof CreateCalendarSchema>;

export const UpdateCalendarSchema = object({
  access: optional(CalendarAccessSchema),
  color: optional(nullable(string())),
  description: optional(nullable(string())),
  isDefault: optional(boolean()),
  name: optional(NameSchema),
  timezone: optional(TimezoneSchema),
});

export type UpdateCalendarInput = InferOutput<typeof UpdateCalendarSchema>;

export const CalendarFiltersSchema = object({
  access: optional(CalendarAccessSchema),
  isDefault: optional(boolean()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  search: optional(string()),
});

export type CalendarFilters = InferOutput<typeof CalendarFiltersSchema>;

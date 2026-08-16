import { EventStatusSchema, RecurrenceFrequencySchema, WeekdaySchema } from "#/schemas/enums";
import { IdSchema, ScopeTypeSchema } from "#/schemas/utils";

import {
  array,
  boolean,
  check,
  date,
  integer,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const EventRecurrenceSchema = pipe(
  object({
    byDay: optional(
      pipe(array(WeekdaySchema), minLength(1, "byDay must list at least one weekday")),
    ),
    count: optional(pipe(number(), integer(), minValue(1, "count must be at least 1"))),
    frequency: RecurrenceFrequencySchema,
    interval: optional(pipe(number(), integer(), minValue(1, "interval must be at least 1")), 1),
    until: optional(string()),
  }),
  check(
    (value) => !(value.count !== undefined && value.until !== undefined),
    "count and until are mutually exclusive",
  ),
  check(
    (value) => value.byDay === undefined || value.frequency === "weekly",
    "byDay is only valid for weekly recurrence",
  ),
);

export type EventRecurrence = InferOutput<typeof EventRecurrenceSchema>;

export const CreateEventSchema = object({
  allDay: optional(boolean(), false),
  calendarId: IdSchema,
  color: optional(nullable(string())),
  description: optional(nullable(string())),
  endsAt: optional(nullable(date())),
  location: optional(nullable(string())),
  recurrence: optional(nullable(EventRecurrenceSchema)),
  sourceEntityId: optional(nullable(IdSchema)),
  sourceType: optional(nullable(ScopeTypeSchema)),
  startsAt: date(),
  status: optional(EventStatusSchema, "confirmed"),
  timezone: optional(nullable(string())),
  title: pipe(string(), minLength(1, "title is required")),
});

export type CreateEventInput = InferOutput<typeof CreateEventSchema>;

export const UpdateEventSchema = object({
  allDay: optional(boolean()),
  calendarId: optional(IdSchema),
  color: optional(nullable(string())),
  description: optional(nullable(string())),
  endsAt: optional(nullable(date())),
  location: optional(nullable(string())),
  recurrence: optional(nullable(EventRecurrenceSchema)),
  sourceEntityId: optional(nullable(IdSchema)),
  sourceType: optional(nullable(ScopeTypeSchema)),
  startsAt: optional(date()),
  status: optional(EventStatusSchema),
  timezone: optional(nullable(string())),
  title: optional(pipe(string(), minLength(1, "title is required"))),
});

export type UpdateEventInput = InferOutput<typeof UpdateEventSchema>;

export const EventFiltersSchema = object({
  calendarId: optional(string()),
  from: optional(date()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  search: optional(string()),
  sourceEntityId: optional(string()),
  sourceType: optional(string()),
  status: optional(EventStatusSchema),
  to: optional(date()),
});

export type EventFilters = InferOutput<typeof EventFiltersSchema>;

export const OccurrencesQuerySchema = object({
  from: optional(date()),
  limit: optional(pipe(number(), integer())),
  to: optional(date()),
});

export type OccurrencesQuery = InferOutput<typeof OccurrencesQuerySchema>;

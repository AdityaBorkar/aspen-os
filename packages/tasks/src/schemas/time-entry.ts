import { IdSchema, IntSchema } from "#/schemas/utils";

import { boolean, date, nullable, object, omit, optional, partial, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateTimeEntrySchema = object({
  billable: optional(boolean()),
  date: optional(date()),
  description: optional(nullable(string())),
  duration: IntSchema,
  taskId: IdSchema,
  userId: IdSchema,
});

export type CreateTimeEntryInput = InferOutput<typeof CreateTimeEntrySchema>;

export const UpdateTimeEntrySchema = partial(omit(CreateTimeEntrySchema, ["taskId", "userId"]));

export type UpdateTimeEntryInput = InferOutput<typeof UpdateTimeEntrySchema>;

export const TimeEntryFiltersSchema = object({
  billable: optional(boolean()),
  taskId: optional(IdSchema),
  userId: optional(IdSchema),
});

export type TimeEntryFilters = InferOutput<typeof TimeEntryFiltersSchema>;

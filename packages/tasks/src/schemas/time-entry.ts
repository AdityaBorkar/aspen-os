import {
  boolean,
  date,
  type InferOutput,
  integer,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";

export const CreateTimeEntrySchema = object({
  billable: optional(boolean()),
  date: optional(date()),
  description: optional(nullable(string())),
  duration: pipe(number(), integer()),
  taskId: pipe(string(), minLength(1, "taskId is required")),
  userId: pipe(string(), minLength(1, "userId is required")),
});

export type CreateTimeEntryInput = InferOutput<typeof CreateTimeEntrySchema>;

export const UpdateTimeEntrySchema = object({
  billable: optional(boolean()),
  date: optional(date()),
  description: optional(nullable(string())),
  duration: optional(pipe(number(), integer())),
});

export type UpdateTimeEntryInput = InferOutput<typeof UpdateTimeEntrySchema>;

export const TimeEntryFiltersSchema = object({
  billable: optional(boolean()),
  taskId: optional(string()),
  userId: optional(string()),
});

export type TimeEntryFilters = InferOutput<typeof TimeEntryFiltersSchema>;

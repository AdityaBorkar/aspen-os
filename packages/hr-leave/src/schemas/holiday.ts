import { HolidayTypeSchema } from "#/schemas/enums";
import { NameSchema } from "#/schemas/utils";

import {
  array,
  boolean,
  minLength,
  nullable,
  number,
  object,
  omit,
  optional,
  partial,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

// Holiday List

export const CreateHolidayListSchema = object({
  description: optional(nullable(string())),
  name: NameSchema,
  weeklyOffDays: optional(nullable(array(string()))),
  year: number(),
});

export type CreateHolidayListInput = InferOutput<typeof CreateHolidayListSchema>;

export const UpdateHolidayListSchema = object({
  ...partial(CreateHolidayListSchema).entries,
  isActive: optional(boolean()),
});

export type UpdateHolidayListInput = InferOutput<typeof UpdateHolidayListSchema>;

// Holiday

export const CreateHolidaySchema = object({
  date: pipe(string(), minLength(1, "Date is required")),
  description: optional(nullable(string())),
  holidayListId: pipe(string(), minLength(1, "Holiday list ID is required")),
  name: NameSchema,
  type: optional(HolidayTypeSchema),
});

export type CreateHolidayInput = InferOutput<typeof CreateHolidaySchema>;

export const UpdateHolidaySchema = partial(omit(CreateHolidaySchema, ["holidayListId"]));

export type UpdateHolidayInput = InferOutput<typeof UpdateHolidaySchema>;

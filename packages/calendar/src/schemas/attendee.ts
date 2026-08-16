import { AttendeeStatusSchema, AttendeeTypeSchema } from "#/schemas/enums";
import { EmailSchema, IdSchema } from "#/schemas/utils";

import { boolean, integer, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateAttendeeSchema = object({
  attendeeId: optional(nullable(IdSchema)),
  attendeeType: optional(AttendeeTypeSchema, "user"),
  email: EmailSchema,
  eventId: IdSchema,
  name: optional(nullable(string())),
  optional: optional(boolean(), false),
  status: optional(AttendeeStatusSchema, "invited"),
});

export type CreateAttendeeInput = InferOutput<typeof CreateAttendeeSchema>;

export const UpdateAttendeeSchema = object({
  attendeeId: optional(nullable(IdSchema)),
  attendeeType: optional(AttendeeTypeSchema),
  email: optional(EmailSchema),
  name: optional(nullable(string())),
  optional: optional(boolean()),
  status: optional(AttendeeStatusSchema),
});

export type UpdateAttendeeInput = InferOutput<typeof UpdateAttendeeSchema>;

export const AttendeeFiltersSchema = object({
  email: optional(string()),
  eventId: optional(IdSchema),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  status: optional(AttendeeStatusSchema),
});

export type AttendeeFilters = InferOutput<typeof AttendeeFiltersSchema>;

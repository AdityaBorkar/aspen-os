import { BranchIdSchema, NameSchema } from "#/schemas/utils";

import {
  array,
  boolean,
  check,
  integer,
  minLength,
  number,
  object,
  optional,
  picklist,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const WeekdaySchema = picklist(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);

export type Weekday = InferOutput<typeof WeekdaySchema>;

const PractitionerId = pipe(string(), minLength(1, "Practitioner ID is required"));

const CreatePractitionerBaseSchema = object({
  branchId: BranchIdSchema,
  email: optional(string()),
  languages: optional(array(string())),
  name: NameSchema,
  overallYrs: optional(pipe(number(), integer())),
  phone: optional(string()),
  specialistYrs: optional(pipe(number(), integer())),
  specialty: optional(string()),
});

type CreatePractitionerBase = InferOutput<typeof CreatePractitionerBaseSchema>;

export const CreatePractitionerSchema = pipe(
  CreatePractitionerBaseSchema,
  check((value: CreatePractitionerBase) => {
    if (value.specialistYrs === undefined || value.overallYrs === undefined) {
      return true;
    }
    return value.specialistYrs <= value.overallYrs;
  }, "Specialist years cannot exceed overall years"),
);

export type CreatePractitionerInput = InferOutput<typeof CreatePractitionerSchema>;

export const UpdatePractitionerSchema = object({
  id: PractitionerId,
  patch: object({
    email: optional(string()),
    languages: optional(array(string())),
    name: optional(NameSchema),
    overallYrs: optional(pipe(number(), integer())),
    phone: optional(string()),
    specialistYrs: optional(pipe(number(), integer())),
    specialty: optional(string()),
  }),
});

export type UpdatePractitionerInput = InferOutput<typeof UpdatePractitionerSchema>;

export const PractitionerFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  search: optional(string()),
  specialty: optional(string()),
  status: optional(string()),
});

export type PractitionerFiltersInput = InferOutput<typeof PractitionerFiltersSchema>;

export const PractitionerIdSchema = object({ id: PractitionerId });

export type PractitionerIdInput = InferOutput<typeof PractitionerIdSchema>;

export const CreateRegistrationSchema = object({
  branchId: BranchIdSchema,
  council: pipe(string(), minLength(1, "Council is required")),
  practitionerId: PractitionerId,
  regNo: pipe(string(), minLength(1, "Registration number is required")),
  year: optional(pipe(number(), integer())),
});

export type CreateRegistrationInput = InferOutput<typeof CreateRegistrationSchema>;

export const CreateEducationSchema = object({
  branchId: BranchIdSchema,
  degree: pipe(string(), minLength(1, "Degree is required")),
  institute: optional(string()),
  practitionerId: PractitionerId,
  year: optional(pipe(number(), integer())),
});

export type CreateEducationInput = InferOutput<typeof CreateEducationSchema>;

export const CreatePostingSchema = object({
  branchId: BranchIdSchema,
  facilityId: optional(string()),
  from: pipe(string(), minLength(1, "Posting start is required")),
  practitionerId: PractitionerId,
  to: optional(string()),
});

export type CreatePostingInput = InferOutput<typeof CreatePostingSchema>;

export const SetPractitionerScheduleSchema = object({
  branchId: BranchIdSchema,
  bufferMin: optional(pipe(number(), integer()), 0),
  emergencyCount: optional(pipe(number(), integer()), 0),
  end: pipe(string(), minLength(1, "End time is required")),
  facilityId: optional(string()),
  practitionerId: PractitionerId,
  slotMin: optional(pipe(number(), integer()), 15),
  start: pipe(string(), minLength(1, "Start time is required")),
  videoFlag: optional(boolean(), false),
  weekday: WeekdaySchema,
});

export type SetPractitionerScheduleInput = InferOutput<typeof SetPractitionerScheduleSchema>;

export const SetPractitionerFeeSchema = object({
  amount: number(),
  branchId: BranchIdSchema,
  effectiveFrom: optional(string()),
  practitionerId: PractitionerId,
  serviceId: optional(string()),
});

export type SetPractitionerFeeInput = InferOutput<typeof SetPractitionerFeeSchema>;

export const CreateLeaveBlockSchema = object({
  branchId: BranchIdSchema,
  from: pipe(string(), minLength(1, "Leave start is required")),
  practitionerId: PractitionerId,
  reason: optional(string()),
  to: pipe(string(), minLength(1, "Leave end is required")),
});

export type CreateLeaveBlockInput = InferOutput<typeof CreateLeaveBlockSchema>;

export const PractitionerConflictQuerySchema = object({
  from: pipe(string(), minLength(1, "Range start is required")),
  practitionerId: PractitionerId,
  to: pipe(string(), minLength(1, "Range end is required")),
});

export type PractitionerConflictQueryInput = InferOutput<typeof PractitionerConflictQuerySchema>;

export const NextFreeSlotQuerySchema = object({
  branchId: BranchIdSchema,
  from: optional(string()),
  practitionerId: PractitionerId,
});

export type NextFreeSlotQueryInput = InferOutput<typeof NextFreeSlotQuerySchema>;

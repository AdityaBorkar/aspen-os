import { ComplianceCategorySchema, ObligationFrequencySchema } from "#/schemas/enums";

import { JsonValueSchema } from "@aspen-os/platform/server";
import {
  array,
  boolean,
  date,
  integer,
  minLength,
  nullable,
  number,
  object,
  optional,
  partial,
  pick,
  pipe,
  record,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreateObligationSchema = object({
  autoGenerate: optional(boolean()),
  branch: optional(nullable(string())),
  category: ComplianceCategorySchema,
  createdBy: pipe(string(), minLength(1, "createdBy is required")),
  customCron: optional(nullable(string())),
  defaultAssignedReviewer: optional(nullable(string())),
  defaultAssignedTo: optional(nullable(string())),
  defaultEscalationDays: optional(array(number())),
  defaultExpiryPolicyDays: optional(array(number())),
  defaultIssuingAuthority: optional(nullable(string())),
  defaultJurisdiction: optional(nullable(string())),
  defaultMetadata: optional(nullable(record(string(), JsonValueSchema))),
  // Deprecated alias — keep wire-compat
  defaultReminderDays: optional(array(number())),
  documentType: optional(nullable(string())),
  dueDay: optional(pipe(number(), integer())),
  dueMonthOffset: optional(pipe(number(), integer())),
  endDate: optional(date()),
  expiryBased: optional(boolean()),
  expiryDurationMonths: optional(pipe(number(), integer())),
  frequency: ObligationFrequencySchema,
  isActive: optional(boolean()),
  name: pipe(string(), minLength(1, "Obligation name is required")),
  periodBased: optional(boolean()),
  sourceEntityId: optional(nullable(string())),
  sourceEntityType: optional(nullable(string())),
  sourceModule: pipe(string(), minLength(1, "sourceModule is required")),
  startDate: date(),
});

export type CreateObligationInput = InferOutput<typeof CreateObligationSchema>;

const MUTABLE_OBLIGATION_KEYS = [
  "autoGenerate",
  "branch",
  "category",
  "customCron",
  "defaultAssignedReviewer",
  "defaultAssignedTo",
  "defaultEscalationDays",
  "defaultExpiryPolicyDays",
  "defaultIssuingAuthority",
  "defaultJurisdiction",
  "defaultMetadata",
  "defaultReminderDays",
  "documentType",
  "dueDay",
  "dueMonthOffset",
  "endDate",
  "expiryBased",
  "expiryDurationMonths",
  "frequency",
  "isActive",
  "name",
  "periodBased",
  "startDate",
] as const;

export const UpdateObligationSchema = partial(
  pick(CreateObligationSchema, MUTABLE_OBLIGATION_KEYS),
);

export type UpdateObligationInput = InferOutput<typeof UpdateObligationSchema>;

export const IMMUTABLE_OBLIGATION_KEYS = [
  "createdBy",
  "sourceEntityId",
  "sourceEntityType",
  "sourceModule",
] as const;

export const ObligationFiltersSchema = object({
  active: optional(boolean()),
  category: optional(ComplianceCategorySchema),
  expiryBased: optional(boolean()),
  isActive: optional(boolean()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  sourceModule: optional(string()),
});

export type ObligationFilters = InferOutput<typeof ObligationFiltersSchema>;

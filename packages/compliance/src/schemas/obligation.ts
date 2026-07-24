import {
  array,
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

import { ComplianceCategorySchema, ObligationFrequencySchema } from "./enums";

export const CreateObligationSchema = object({
  autoGenerate: optional(boolean()),
  branch: optional(nullable(string())),
  category: ComplianceCategorySchema,
  createdBy: pipe(string(), minLength(1, "createdBy is required")),
  customCron: optional(nullable(string())),
  defaultAssignedReviewer: optional(nullable(string())),
  defaultAssignedTo: optional(nullable(string())),
  defaultEscalationDays: optional(array(number())),
  defaultIssuingAuthority: optional(nullable(string())),
  defaultJurisdiction: optional(nullable(string())),
  defaultMetadata: optional(nullable(object({}))),
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

export const UpdateObligationSchema = object({
  autoGenerate: optional(boolean()),
  branch: optional(nullable(string())),
  category: optional(ComplianceCategorySchema),
  customCron: optional(nullable(string())),
  defaultAssignedReviewer: optional(nullable(string())),
  defaultAssignedTo: optional(nullable(string())),
  defaultEscalationDays: optional(array(number())),
  defaultIssuingAuthority: optional(nullable(string())),
  defaultJurisdiction: optional(nullable(string())),
  defaultMetadata: optional(nullable(object({}))),
  defaultReminderDays: optional(array(number())),
  documentType: optional(nullable(string())),
  dueDay: optional(pipe(number(), integer())),
  dueMonthOffset: optional(pipe(number(), integer())),
  endDate: optional(date()),
  expiryBased: optional(boolean()),
  expiryDurationMonths: optional(pipe(number(), integer())),
  frequency: optional(ObligationFrequencySchema),
  isActive: optional(boolean()),
  name: optional(string()),
  periodBased: optional(boolean()),
  startDate: optional(date()),
});

export type UpdateObligationInput = InferOutput<typeof UpdateObligationSchema>;

export const ObligationFiltersSchema = object({
  active: optional(boolean()),
  category: optional(ComplianceCategorySchema),
  expiryBased: optional(boolean()),
  sourceModule: optional(string()),
});

export type ObligationFilters = InferOutput<typeof ObligationFiltersSchema>;

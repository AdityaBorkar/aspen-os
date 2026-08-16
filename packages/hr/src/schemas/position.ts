import { DateStringSchema, NameSchema } from "#/schemas/utils";

import { boolean, minLength, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

// Position

export const CreatePositionSchema = object({
  branch: optional(nullable(string())),
  department: pipe(string(), minLength(1, "Department is required")),
  designation: optional(nullable(string())),
  employmentType: optional(nullable(string())),
  headcount: optional(number(), 1),
  jobDescription: optional(nullable(string())),
  name: NameSchema,
  reportsToPosition: optional(nullable(string())),
});

export type CreatePositionInput = InferOutput<typeof CreatePositionSchema>;

export const UpdatePositionSchema = object({
  branch: optional(nullable(string())),
  department: optional(string()),
  designation: optional(nullable(string())),
  employmentType: optional(nullable(string())),
  headcount: optional(number()),
  isActive: optional(boolean()),
  jobDescription: optional(nullable(string())),
  name: optional(NameSchema),
  reportsToPosition: optional(nullable(string())),
});

export type UpdatePositionInput = InferOutput<typeof UpdatePositionSchema>;

export const PositionFiltersSchema = object({
  branch: optional(string()),
  department: optional(string()),
  designation: optional(string()),
  isActive: optional(boolean()),
});

export type PositionFilters = InferOutput<typeof PositionFiltersSchema>;

// Position Assignment

export const AssignEmployeeSchema = object({
  fromDate: optional(DateStringSchema),
  isPrimary: optional(boolean(), false),
  toDate: optional(nullable(string())),
});

export type AssignEmployeeInput = InferOutput<typeof AssignEmployeeSchema>;

export const TransferAssignmentSchema = object({
  newPositionId: pipe(string(), minLength(1, "New position ID is required")),
  toDate: optional(nullable(string())),
});

export type TransferAssignmentInput = InferOutput<typeof TransferAssignmentSchema>;

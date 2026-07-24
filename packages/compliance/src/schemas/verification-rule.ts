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

import {
  AuditActionSchema,
  AuditEntityTypeSchema,
  ComplianceCategorySchema,
} from "./enums";

export const CreateVerificationRuleSchema = object({
  assignedReviewer: optional(nullable(string())),
  category: optional(nullable(ComplianceCategorySchema)),
  isActive: optional(boolean()),
  name: pipe(string(), minLength(1, "Rule name is required")),
  priority: optional(pipe(number(), integer())),
  requiredReviewerRole: optional(nullable(string())),
  sourceModule: optional(nullable(string())),
});

export type CreateVerificationRuleInput = InferOutput<
  typeof CreateVerificationRuleSchema
>;

export const UpdateVerificationRuleSchema = object({
  assignedReviewer: optional(nullable(string())),
  category: optional(nullable(ComplianceCategorySchema)),
  isActive: optional(boolean()),
  name: optional(string()),
  priority: optional(pipe(number(), integer())),
  requiredReviewerRole: optional(nullable(string())),
  sourceModule: optional(nullable(string())),
});

export type UpdateVerificationRuleInput = InferOutput<
  typeof UpdateVerificationRuleSchema
>;

export const AuditTrailFiltersSchema = object({
  action: optional(AuditActionSchema),
  dateFrom: optional(date()),
  dateTo: optional(date()),
  entityType: optional(AuditEntityTypeSchema),
  performedBy: optional(string()),
});

export type AuditTrailFilters = InferOutput<typeof AuditTrailFiltersSchema>;

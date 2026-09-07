import {
  AuditActionSchema,
  AuditEntityTypeSchema,
  ComplianceCategorySchema,
} from "#/schemas/enums";

import {
  boolean,
  integer,
  minLength,
  nullable,
  number,
  object,
  optional,
  partial,
  pick,
  pipe,
  string,
  date,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreateVerificationRuleSchema = object({
  assignedReviewer: optional(nullable(string())),
  category: optional(nullable(ComplianceCategorySchema)),
  isActive: optional(boolean()),
  name: pipe(string(), minLength(1, "Rule name is required")),
  priority: optional(pipe(number(), integer())),
  requiredReviewerRole: optional(nullable(string())),
  sourceModule: optional(nullable(string())),
});

export type CreateVerificationRuleInput = InferOutput<typeof CreateVerificationRuleSchema>;

export const UpdateVerificationRuleSchema = partial(
  pick(CreateVerificationRuleSchema, [
    "assignedReviewer",
    "category",
    "isActive",
    "name",
    "priority",
    "requiredReviewerRole",
    "sourceModule",
  ]),
);

export type UpdateVerificationRuleInput = InferOutput<typeof UpdateVerificationRuleSchema>;

export const AuditTrailFiltersSchema = object({
  action: optional(AuditActionSchema),
  dateFrom: optional(date()),
  dateTo: optional(date()),
  entityType: optional(AuditEntityTypeSchema),
  performedBy: optional(string()),
});

export type AuditTrailFilters = InferOutput<typeof AuditTrailFiltersSchema>;

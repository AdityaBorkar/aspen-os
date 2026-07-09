import {
  array,
  boolean,
  date,
  type InferOutput,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import {
  ComplianceCategorySchema,
  ComplianceStatusSchema,
  RenewalFrequencySchema,
} from "./enums";

export const CreateComplianceDocumentSchema = object({
  attachment: optional(nullable(string())),
  autoRenewal: optional(boolean()),
  branch: optional(nullable(string())),
  category: ComplianceCategorySchema,
  connection: optional(nullable(string())),
  createdBy: pipe(string(), minLength(1, "createdBy is required")),
  documentNumber: optional(nullable(string())),
  expiryDate: optional(date()),
  issueDate: optional(nullable(string())),
  issuingAuthority: optional(nullable(string())),
  name: pipe(string(), minLength(1, "Document name is required")),
  notes: optional(nullable(string())),
  reminderDays: optional(array(number())),
  renewalDate: optional(date()),
  renewalFrequency: optional(RenewalFrequencySchema),
});

export type CreateComplianceDocumentInput = InferOutput<
  typeof CreateComplianceDocumentSchema
>;

export const UpdateComplianceDocumentSchema = object({
  attachment: optional(nullable(string())),
  autoRenewal: optional(boolean()),
  branch: optional(nullable(string())),
  category: optional(ComplianceCategorySchema),
  connection: optional(nullable(string())),
  documentNumber: optional(nullable(string())),
  expiryDate: optional(date()),
  issueDate: optional(nullable(string())),
  issuingAuthority: optional(nullable(string())),
  name: optional(string()),
  notes: optional(nullable(string())),
  reminderDays: optional(array(number())),
  renewalDate: optional(date()),
  renewalFrequency: optional(RenewalFrequencySchema),
});

export type UpdateComplianceDocumentInput = InferOutput<
  typeof UpdateComplianceDocumentSchema
>;

export const ComplianceFiltersSchema = object({
  branch: optional(string()),
  category: optional(ComplianceCategorySchema),
  expiringWithinDays: optional(number()),
  status: optional(ComplianceStatusSchema),
});

export type ComplianceFilters = InferOutput<typeof ComplianceFiltersSchema>;

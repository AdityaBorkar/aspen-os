import {
  ComplianceCategorySchema,
  ExpiryPolicyChannelSchema,
  ReminderChannelSchema,
  RenewalFrequencySchema,
  VerificationStatusSchema,
} from "#/schemas/enums";

import { JsonValueSchema } from "@aspen-os/platform/server";
import {
  array,
  boolean,
  date,
  literal,
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
  union,
} from "valibot";
import type { InferOutput } from "valibot";

const metadataSchema = optional(nullable(record(string(), JsonValueSchema)));

export const CreateComplianceDocumentSchema = object({
  assignedReviewer: optional(nullable(string())),
  assignedTo: optional(nullable(string())),
  attachment: optional(nullable(string())),
  autoRenewal: optional(boolean()),
  branch: optional(nullable(string())),
  category: ComplianceCategorySchema,
  connection: optional(nullable(string())),
  createdBy: pipe(string(), minLength(1, "createdBy is required")),
  documentType: optional(nullable(string())),
  dueDate: optional(date()),
  effectiveDate: optional(date()),
  escalationDays: optional(array(number())),
  expiryDate: optional(date()),
  expiryPolicyChannel: optional(ExpiryPolicyChannelSchema),
  expiryPolicyDays: optional(array(number())),
  issueDate: optional(date()),
  issuingAuthority: optional(nullable(string())),
  jurisdiction: optional(nullable(string())),
  metadata: metadataSchema,
  name: pipe(string(), minLength(1, "Document name is required")),
  notes: optional(nullable(string())),
  obligationId: optional(nullable(string())),
  periodEnd: optional(date()),
  periodStart: optional(date()),
  referenceNumber: optional(nullable(string())),
  // Deprecated aliases — keep wire-compat for one minor
  reminderChannel: optional(ReminderChannelSchema),
  reminderDays: optional(array(number())),
  renewalDate: optional(date()),
  renewalFrequency: optional(RenewalFrequencySchema),
  sourceEntityId: optional(nullable(string())),
  sourceEntityType: optional(nullable(string())),
  sourceModule: pipe(string(), minLength(1, "sourceModule is required")),
});

export type CreateComplianceDocumentInput = InferOutput<typeof CreateComplianceDocumentSchema>;

const MUTABLE_DOCUMENT_KEYS = [
  "assignedReviewer",
  "assignedTo",
  "attachment",
  "autoRenewal",
  "branch",
  "category",
  "connection",
  "documentType",
  "dueDate",
  "effectiveDate",
  "escalationDays",
  "expiryDate",
  "expiryPolicyChannel",
  "expiryPolicyDays",
  "issueDate",
  "issuingAuthority",
  "jurisdiction",
  "metadata",
  "name",
  "notes",
  "periodEnd",
  "periodStart",
  "referenceNumber",
  "reminderChannel",
  "reminderDays",
  "renewalDate",
  "renewalFrequency",
] as const;

export const UpdateComplianceDocumentSchema = partial(
  pick(CreateComplianceDocumentSchema, MUTABLE_DOCUMENT_KEYS),
);

export type UpdateComplianceDocumentInput = InferOutput<typeof UpdateComplianceDocumentSchema>;

export const IMMUTABLE_DOCUMENT_KEYS = [
  "createdBy",
  "obligationId",
  "sourceEntityId",
  "sourceEntityType",
  "sourceModule",
] as const;

export const ComplianceDocumentFiltersSchema = object({
  assignedReviewer: optional(string()),
  branch: optional(string()),
  category: optional(ComplianceCategorySchema),
  dueWithinDays: optional(number()),
  expiringWithinDays: optional(number()),
  jurisdiction: optional(string()),
  obligationId: optional(string()),
  orderBy: optional(
    union([literal("updatedAtDesc"), literal("periodStartAsc"), literal("expiryAsc")]),
  ),
  requireCompletedAtNull: optional(boolean()),
  reviewer: optional(string()),
  sourceEntityId: optional(string()),
  sourceEntityType: optional(string()),
  sourceModule: optional(string()),
  statuses: optional(array(VerificationStatusSchema)),
  verificationStatus: optional(VerificationStatusSchema),
});

export type ComplianceDocumentFilters = InferOutput<typeof ComplianceDocumentFiltersSchema>;

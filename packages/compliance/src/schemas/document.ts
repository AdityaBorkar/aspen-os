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
  ReminderChannelSchema,
  RenewalFrequencySchema,
  VerificationStatusSchema,
} from "./enums";

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
  issueDate: optional(date()),
  issuingAuthority: optional(nullable(string())),
  jurisdiction: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  name: pipe(string(), minLength(1, "Document name is required")),
  notes: optional(nullable(string())),
  obligationId: optional(nullable(string())),
  periodEnd: optional(date()),
  periodStart: optional(date()),
  referenceNumber: optional(nullable(string())),
  reminderChannel: optional(ReminderChannelSchema),
  reminderDays: optional(array(number())),
  renewalDate: optional(date()),
  renewalFrequency: optional(RenewalFrequencySchema),
  sourceEntityId: optional(nullable(string())),
  sourceEntityType: optional(nullable(string())),
  sourceModule: pipe(string(), minLength(1, "sourceModule is required")),
});

export type CreateComplianceDocumentInput = InferOutput<
  typeof CreateComplianceDocumentSchema
>;

export const UpdateComplianceDocumentSchema = object({
  assignedReviewer: optional(nullable(string())),
  assignedTo: optional(nullable(string())),
  attachment: optional(nullable(string())),
  autoRenewal: optional(boolean()),
  branch: optional(nullable(string())),
  category: optional(ComplianceCategorySchema),
  connection: optional(nullable(string())),
  documentType: optional(nullable(string())),
  dueDate: optional(date()),
  effectiveDate: optional(date()),
  escalationDays: optional(array(number())),
  expiryDate: optional(date()),
  issueDate: optional(date()),
  issuingAuthority: optional(nullable(string())),
  jurisdiction: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  name: optional(string()),
  notes: optional(nullable(string())),
  periodEnd: optional(date()),
  periodStart: optional(date()),
  referenceNumber: optional(nullable(string())),
  reminderChannel: optional(ReminderChannelSchema),
  reminderDays: optional(array(number())),
  renewalDate: optional(date()),
  renewalFrequency: optional(RenewalFrequencySchema),
  verificationStatus: optional(VerificationStatusSchema),
});

export type UpdateComplianceDocumentInput = InferOutput<
  typeof UpdateComplianceDocumentSchema
>;

export const ComplianceDocumentFiltersSchema = object({
  assignedReviewer: optional(string()),
  branch: optional(string()),
  category: optional(ComplianceCategorySchema),
  dueWithinDays: optional(number()),
  expiringWithinDays: optional(number()),
  jurisdiction: optional(string()),
  obligationId: optional(string()),
  reviewer: optional(string()),
  sourceEntityId: optional(string()),
  sourceEntityType: optional(string()),
  sourceModule: optional(string()),
  verificationStatus: optional(VerificationStatusSchema),
});

export type ComplianceDocumentFilters = InferOutput<
  typeof ComplianceDocumentFiltersSchema
>;

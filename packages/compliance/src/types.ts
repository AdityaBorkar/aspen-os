import {
  array,
  boolean,
  date,
  enum as enum_,
  type InferOutput,
  integer,
  integer as integerFn,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import type {
  AuditAction,
  AuditEntityType,
  ComplianceCategory,
  ObligationFrequency,
  ReminderChannel,
  RenewalFrequency,
  VerificationStatus,
} from "./constants";

export const ComplianceCategorySchema = enum_({
  audit: "audit",
  certificate: "certificate",
  data_privacy: "data_privacy",
  environmental: "environmental",
  financial: "financial",
  hr: "hr",
  insurance: "insurance",
  legal: "legal",
  license: "license",
  other: "other",
  permit: "permit",
  property: "property",
  regulatory: "regulatory",
  safety: "safety",
  tax: "tax",
  vehicle: "vehicle",
});

export const VerificationStatusSchema = enum_({
  archived: "archived",
  draft: "draft",
  expired: "expired",
  overdue: "overdue",
  rejected: "rejected",
  renewed: "renewed",
  submitted: "submitted",
  under_review: "under_review",
  verified: "verified",
});

export const RenewalFrequencySchema = enum_({
  annual: "annual",
  biennial: "biennial",
  monthly: "monthly",
  one_time: "one_time",
  quarterly: "quarterly",
  semi_annual: "semi_annual",
  triennial: "triennial",
});

export const ObligationFrequencySchema = enum_({
  annual: "annual",
  biennial: "biennial",
  custom: "custom",
  monthly: "monthly",
  quarterly: "quarterly",
  semi_annual: "semi_annual",
  triennial: "triennial",
});

export const ReminderChannelSchema = enum_({
  both: "both",
  email: "email",
  pubsub: "pubsub",
});

export const AuditEntityTypeSchema = enum_({
  compliance_document: "compliance_document",
  compliance_obligation: "compliance_obligation",
  verification_rule: "verification_rule",
});

export const AuditActionSchema = enum_({
  archived: "archived",
  attachment_uploaded: "attachment_uploaded",
  completed: "completed",
  created: "created",
  document_generated: "document_generated",
  escalated: "escalated",
  expired: "expired",
  obligation_activated: "obligation_activated",
  obligation_deactivated: "obligation_deactivated",
  overdue: "overdue",
  rejected: "rejected",
  reminder_sent: "reminder_sent",
  renewed: "renewed",
  reviewer_assigned: "reviewer_assigned",
  snoozed: "snoozed",
  submitted: "submitted",
  updated: "updated",
  verified: "verified",
});

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

export const CreateVerificationRuleSchema = object({
  assignedReviewer: optional(nullable(string())),
  category: optional(nullable(ComplianceCategorySchema)),
  isActive: optional(boolean()),
  name: pipe(string(), minLength(1, "Rule name is required")),
  priority: optional(pipe(number(), integerFn())),
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
  priority: optional(pipe(number(), integerFn())),
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

export interface DashboardSummary {
  activeObligations: number;
  byBranch: Record<string, number>;
  byCategory: Record<string, number>;
  bySourceModule: Record<string, number>;
  byStatus: Record<string, number>;
  documentsGenerated30d: number;
  dueSoon: number;
  expired: number;
  expiringSoon: number;
  healthScore: number;
  overdue: number;
  pendingReview: number;
  rejected: number;
  total: number;
  verified: number;
}

export interface TimelineEntry {
  assignedReviewer: string | null;
  assignedTo: string | null;
  category: ComplianceCategory;
  daysRemaining: number;
  documentType: string | null;
  expiryDate: string | null;
  id: string;
  isObligationGenerated: boolean;
  name: string;
  remindersSent: boolean;
  sourceModule: string;
  verificationStatus: VerificationStatus;
}

export interface PeriodPreview {
  dueDate: string | null;
  expiryDate: string | null;
  periodEnd: string | null;
  periodStart: string | null;
}

export interface RenewalChainEntry {
  createdAt: string;
  id: string;
  name: string;
  renewedFrom: string | null;
  verificationStatus: VerificationStatus;
}

export type {
  AuditAction,
  AuditEntityType,
  ComplianceCategory,
  ObligationFrequency,
  ReminderChannel,
  RenewalFrequency,
  VerificationStatus,
};

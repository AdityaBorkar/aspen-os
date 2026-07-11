import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  COMPLIANCE_CATEGORY,
  OBLIGATION_FREQUENCY,
  REMINDER_CHANNEL,
  RENEWAL_FREQUENCY,
  VERIFICATION_STATUS,
} from "./constants";

export const complianceCategoryEnum = pgEnum("compliance_category", [
  COMPLIANCE_CATEGORY.TAX,
  COMPLIANCE_CATEGORY.LICENSE,
  COMPLIANCE_CATEGORY.CERTIFICATE,
  COMPLIANCE_CATEGORY.PERMIT,
  COMPLIANCE_CATEGORY.INSURANCE,
  COMPLIANCE_CATEGORY.REGULATORY,
  COMPLIANCE_CATEGORY.LEGAL,
  COMPLIANCE_CATEGORY.HR,
  COMPLIANCE_CATEGORY.SAFETY,
  COMPLIANCE_CATEGORY.ENVIRONMENTAL,
  COMPLIANCE_CATEGORY.DATA_PRIVACY,
  COMPLIANCE_CATEGORY.FINANCIAL,
  COMPLIANCE_CATEGORY.VEHICLE,
  COMPLIANCE_CATEGORY.PROPERTY,
  COMPLIANCE_CATEGORY.AUDIT,
  COMPLIANCE_CATEGORY.OTHER,
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  VERIFICATION_STATUS.DRAFT,
  VERIFICATION_STATUS.SUBMITTED,
  VERIFICATION_STATUS.UNDER_REVIEW,
  VERIFICATION_STATUS.VERIFIED,
  VERIFICATION_STATUS.REJECTED,
  VERIFICATION_STATUS.EXPIRED,
  VERIFICATION_STATUS.OVERDUE,
  VERIFICATION_STATUS.RENEWED,
  VERIFICATION_STATUS.ARCHIVED,
]);

export const renewalFrequencyEnum = pgEnum("renewal_frequency", [
  RENEWAL_FREQUENCY.ONE_TIME,
  RENEWAL_FREQUENCY.MONTHLY,
  RENEWAL_FREQUENCY.QUARTERLY,
  RENEWAL_FREQUENCY.SEMI_ANNUAL,
  RENEWAL_FREQUENCY.ANNUAL,
  RENEWAL_FREQUENCY.BIENNIAL,
  RENEWAL_FREQUENCY.TRIENNIAL,
]);

export const obligationFrequencyEnum = pgEnum("obligation_frequency", [
  OBLIGATION_FREQUENCY.MONTHLY,
  OBLIGATION_FREQUENCY.QUARTERLY,
  OBLIGATION_FREQUENCY.SEMI_ANNUAL,
  OBLIGATION_FREQUENCY.ANNUAL,
  OBLIGATION_FREQUENCY.BIENNIAL,
  OBLIGATION_FREQUENCY.TRIENNIAL,
  OBLIGATION_FREQUENCY.CUSTOM,
]);

export const reminderChannelEnum = pgEnum("reminder_channel", [
  REMINDER_CHANNEL.PUBSUB,
  REMINDER_CHANNEL.EMAIL,
  REMINDER_CHANNEL.BOTH,
]);

export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  AUDIT_ENTITY_TYPE.COMPLIANCE_DOCUMENT,
  AUDIT_ENTITY_TYPE.COMPLIANCE_OBLIGATION,
  AUDIT_ENTITY_TYPE.VERIFICATION_RULE,
]);

export const auditActionEnum = pgEnum("audit_action", [
  AUDIT_ACTION.CREATED,
  AUDIT_ACTION.UPDATED,
  AUDIT_ACTION.SUBMITTED,
  AUDIT_ACTION.VERIFIED,
  AUDIT_ACTION.REJECTED,
  AUDIT_ACTION.EXPIRED,
  AUDIT_ACTION.OVERDUE,
  AUDIT_ACTION.RENEWED,
  AUDIT_ACTION.ARCHIVED,
  AUDIT_ACTION.COMPLETED,
  AUDIT_ACTION.ESCALATED,
  AUDIT_ACTION.REMINDER_SENT,
  AUDIT_ACTION.SNOOZED,
  AUDIT_ACTION.ATTACHMENT_UPLOADED,
  AUDIT_ACTION.REVIEWER_ASSIGNED,
  AUDIT_ACTION.OBLIGATION_ACTIVATED,
  AUDIT_ACTION.OBLIGATION_DEACTIVATED,
  AUDIT_ACTION.DOCUMENT_GENERATED,
]);

export const complianceDocument = pgTable(
  "compliance_document",
  {
    assignedReviewer: text("assigned_reviewer"),
    assignedTo: text("assigned_to"),
    attachment: text("attachment"),
    autoRenewal: boolean("auto_renewal").notNull().default(false),
    branch: text("branch"),
    category: complianceCategoryEnum("category").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    connection: text("connection"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by").notNull(),
    documentType: text("document_type"),
    dueDate: date("due_date"),
    effectiveDate: date("effective_date"),
    escalationDays: integer("escalation_days").array(),
    expiryDate: date("expiry_date"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    issueDate: date("issue_date"),
    issuingAuthority: text("issuing_authority"),
    jurisdiction: text("jurisdiction"),
    lastEscalatedAt: timestamp("last_escalated_at", { withTimezone: true }),
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    notes: text("notes"),
    obligationId: text("obligation_id"),
    periodEnd: date("period_end"),
    periodStart: date("period_start"),
    referenceNumber: text("reference_number"),
    rejectionReason: text("rejection_reason"),
    reminderChannel: reminderChannelEnum("reminder_channel").default("pubsub"),
    reminderDays: integer("reminder_days").array().default([90, 60, 30, 7]),
    renewalDate: date("renewal_date"),
    renewalFrequency: renewalFrequencyEnum("renewal_frequency"),
    renewedFrom: text("renewed_from"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    sourceEntityId: text("source_entity_id"),
    sourceEntityType: text("source_entity_type"),
    sourceModule: text("source_module").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("draft"),
  },
  (table) => [
    index("idx_compliance_document_category").on(table.category),
    index("idx_compliance_document_status").on(table.verificationStatus),
    index("idx_compliance_document_branch").on(table.branch),
    index("idx_compliance_document_expiry").on(table.expiryDate),
    index("idx_compliance_document_due").on(table.dueDate),
    index("idx_compliance_document_source").on(
      table.sourceModule,
      table.sourceEntityType,
      table.sourceEntityId,
    ),
    index("idx_compliance_document_reviewer").on(table.assignedReviewer),
    index("idx_compliance_document_assignee").on(table.assignedTo),
    index("idx_compliance_document_obligation").on(table.obligationId),
    index("idx_compliance_document_renewed_from").on(table.renewedFrom),
  ],
);

export const complianceObligation = pgTable(
  "compliance_obligation",
  {
    autoGenerate: boolean("auto_generate").notNull().default(true),
    branch: text("branch"),
    category: complianceCategoryEnum("category").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by").notNull(),
    customCron: text("custom_cron"),
    defaultAssignedReviewer: text("default_assigned_reviewer"),
    defaultAssignedTo: text("default_assigned_to"),
    defaultEscalationDays: integer("default_escalation_days").array(),
    defaultIssuingAuthority: text("default_issuing_authority"),
    defaultJurisdiction: text("default_jurisdiction"),
    defaultMetadata: jsonb("default_metadata"),
    defaultReminderDays: integer("default_reminder_days").array(),
    documentType: text("document_type"),
    dueDay: integer("due_day"),
    dueMonthOffset: integer("due_month_offset"),
    endDate: date("end_date"),
    expiryBased: boolean("expiry_based").notNull().default(false),
    expiryDurationMonths: integer("expiry_duration_months"),
    frequency: obligationFrequencyEnum("frequency").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    periodBased: boolean("period_based").notNull().default(false),
    sourceEntityId: text("source_entity_id"),
    sourceEntityType: text("source_entity_type"),
    sourceModule: text("source_module").notNull(),
    startDate: date("start_date").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_compliance_obligation_active").on(table.isActive),
    index("idx_compliance_obligation_category").on(table.category),
    index("idx_compliance_obligation_source").on(
      table.sourceModule,
      table.sourceEntityType,
      table.sourceEntityId,
    ),
  ],
);

export const complianceVerificationRule = pgTable(
  "compliance_verification_rule",
  {
    assignedReviewer: text("assigned_reviewer"),
    category: complianceCategoryEnum("category"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    priority: integer("priority").notNull().default(0),
    requiredReviewerRole: text("required_reviewer_role"),
    sourceModule: text("source_module"),
  },
  (table) => [
    index("idx_compliance_verification_rule_active").on(table.isActive),
    index("idx_compliance_verification_rule_category").on(table.category),
    index("idx_compliance_verification_rule_priority").on(table.priority),
  ],
);

export const complianceAuditEntry = pgTable(
  "compliance_audit_entry",
  {
    action: auditActionEnum("action").notNull(),
    changes: jsonb("changes"),
    entityId: text("entity_id").notNull(),
    entityType: auditEntityTypeEnum("entity_type").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    metadata: jsonb("metadata"),
    newState: jsonb("new_state"),
    notes: text("notes"),
    performedAt: timestamp("performed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    performedBy: text("performed_by"),
    previousState: jsonb("previous_state"),
  },
  (table) => [
    index("idx_compliance_audit_entity").on(table.entityType, table.entityId),
    index("idx_compliance_audit_action").on(table.action),
    index("idx_compliance_audit_performed_by").on(table.performedBy),
    index("idx_compliance_audit_performed_at").on(table.performedAt),
  ],
);

export const complianceTables = {
  complianceAuditEntry,
  complianceDocument,
  complianceObligation,
  complianceVerificationRule,
} as const;

export type ComplianceDocument = typeof complianceDocument.$inferSelect;
export type ComplianceObligation = typeof complianceObligation.$inferSelect;
export type ComplianceVerificationRule =
  typeof complianceVerificationRule.$inferSelect;
export type ComplianceAuditEntry = typeof complianceAuditEntry.$inferSelect;

export type NewComplianceDocument = typeof complianceDocument.$inferInsert;
export type NewComplianceObligation = typeof complianceObligation.$inferInsert;
export type NewComplianceVerificationRule =
  typeof complianceVerificationRule.$inferInsert;
export type NewComplianceAuditEntry = typeof complianceAuditEntry.$inferInsert;

export { sql };

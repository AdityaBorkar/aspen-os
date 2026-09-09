import {
  complianceCategoryEnum,
  expiryPolicyChannelEnum,
  renewalFrequencyEnum,
  verificationStatusEnum,
} from "#/db-schemas/enums";
import { DEFAULT_EXPIRY_POLICY_DAYS_EXPIRY } from "#/utils/constants";

import { uuidv7 } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const complianceDocument = pgTable(
  "document",
  {
    assigned_reviewer: text(),
    assigned_to: text(),
    attachment: text(),
    auto_renewal: boolean().notNull().default(false),
    branch: text(),
    category: complianceCategoryEnum().notNull(),
    completed_at: timestamp({ withTimezone: true }),
    connection: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    document_type: text(),
    due_date: date(),
    effective_date: date(),
    escalation_days: integer().array(),
    expiry_date: date(),
    expiry_policy_channel: expiryPolicyChannelEnum().default("pubsub"),
    expiry_policy_days: integer().array().default(DEFAULT_EXPIRY_POLICY_DAYS_EXPIRY),
    id: uuidv7().primaryKey(),
    issue_date: date(),
    issuing_authority: text(),
    jurisdiction: text(),
    last_escalated_at: timestamp({ withTimezone: true }),
    last_notified_at: timestamp({ withTimezone: true }),
    metadata: jsonb().$type<Record<string, JsonValue> | null>(),
    name: text().notNull(),
    notes: text(),
    obligation_id: text(),
    period_end: date(),
    period_start: date(),
    reference_number: text(),
    rejection_reason: text(),
    renewal_date: date(),
    renewal_frequency: renewalFrequencyEnum(),
    renewed_from: text(),
    reviewed_at: timestamp({ withTimezone: true }),
    reviewed_by: text(),
    snoozed_until: timestamp({ withTimezone: true }),
    source_entity_id: text(),
    source_entity_type: text(),
    source_module: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    verification_status: verificationStatusEnum().notNull().default("draft"),
  },
  (table) => [
    index("idx_document_category").on(table.category),
    index("idx_document_status").on(table.verification_status),
    index("idx_document_branch").on(table.branch),
    index("idx_document_expiry").on(table.expiry_date),
    index("idx_document_due").on(table.due_date),
    index("idx_document_source").on(
      table.source_module,
      table.source_entity_type,
      table.source_entity_id,
    ),
    index("idx_document_reviewer").on(table.assigned_reviewer),
    index("idx_document_assignee").on(table.assigned_to),
    index("idx_document_obligation").on(table.obligation_id),
    index("idx_document_renewed_from").on(table.renewed_from),
  ],
);

export type ComplianceDocument = typeof complianceDocument.$inferSelect;
export type NewComplianceDocument = typeof complianceDocument.$inferInsert;

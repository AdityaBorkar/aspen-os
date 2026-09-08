import { complianceCategoryEnum, obligationFrequencyEnum } from "#/db-schemas/enums";

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

export const complianceObligation = pgTable(
  "compliance_obligation",
  {
    auto_generate: boolean().notNull().default(true),
    branch: text(),
    category: complianceCategoryEnum().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    custom_cron: text(),
    default_assigned_reviewer: text(),
    default_assigned_to: text(),
    default_escalation_days: integer().array(),
    default_issuing_authority: text(),
    default_jurisdiction: text(),
    default_metadata: jsonb().$type<Record<string, JsonValue> | null>(),
    default_reminder_days: integer().array(),
    document_type: text(),
    due_day: integer(),
    due_month_offset: integer(),
    end_date: date(),
    expiry_based: boolean().notNull().default(false),
    expiry_duration_months: integer(),
    frequency: obligationFrequencyEnum().notNull(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    name: text().notNull(),
    period_based: boolean().notNull().default(false),
    source_entity_id: text(),
    source_entity_type: text(),
    source_module: text().notNull(),
    start_date: date().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_compliance_obligation_active").on(table.is_active),
    index("idx_compliance_obligation_category").on(table.category),
    index("idx_compliance_obligation_source").on(
      table.source_module,
      table.source_entity_type,
      table.source_entity_id,
    ),
  ],
);

export type ComplianceObligation = typeof complianceObligation.$inferSelect;
export type NewComplianceObligation = typeof complianceObligation.$inferInsert;

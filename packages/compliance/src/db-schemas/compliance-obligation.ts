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
    autoGenerate: boolean("auto_generate").notNull().default(true),
    branch: text("branch"),
    category: complianceCategoryEnum("category").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").notNull(),
    customCron: text("custom_cron"),
    defaultAssignedReviewer: text("default_assigned_reviewer"),
    defaultAssignedTo: text("default_assigned_to"),
    defaultEscalationDays: integer("default_escalation_days").array(),
    defaultIssuingAuthority: text("default_issuing_authority"),
    defaultJurisdiction: text("default_jurisdiction"),
    defaultMetadata: jsonb("default_metadata").$type<Record<string, JsonValue> | null>(),
    defaultReminderDays: integer("default_reminder_days").array(),
    documentType: text("document_type"),
    dueDay: integer("due_day"),
    dueMonthOffset: integer("due_month_offset"),
    endDate: date("end_date"),
    expiryBased: boolean("expiry_based").notNull().default(false),
    expiryDurationMonths: integer("expiry_duration_months"),
    frequency: obligationFrequencyEnum("frequency").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    periodBased: boolean("period_based").notNull().default(false),
    sourceEntityId: text("source_entity_id"),
    sourceEntityType: text("source_entity_type"),
    sourceModule: text("source_module").notNull(),
    startDate: date("start_date").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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

export type ComplianceObligation = typeof complianceObligation.$inferSelect;
export type NewComplianceObligation = typeof complianceObligation.$inferInsert;

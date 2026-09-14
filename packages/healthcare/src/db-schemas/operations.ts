import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const healthcareReportDefinition = pgTable(
  "healthcare_report_definition",
  {
    branch_id: text().notNull().default("main"),
    collection: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    filters: text(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull().default("draft"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_report_definition_branch_id").on(table.branch_id),
    index("idx_healthcare_report_definition_collection").on(table.collection),
  ],
);

export const healthcareComplianceEvidence = pgTable(
  "healthcare_compliance_evidence",
  {
    attested_by: text(),
    branch_id: text().notNull().default("main"),
    control: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    evidence_path: text().notNull(),
    framework: text().notNull(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    recorded_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_compliance_evidence_branch_id").on(table.branch_id),
    index("idx_healthcare_compliance_evidence_framework").on(table.framework),
  ],
);

export const healthcareMasterEntry = pgTable(
  "healthcare_master_entry",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    domain: text().notNull(),
    id: uuidv7().primaryKey(),
    key: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    value: text().notNull(),
    version: integer().notNull().default(1),
  },
  (table) => [
    uniqueIndex("idx_healthcare_master_entry_domain_key").on(table.domain, table.key),
    index("idx_healthcare_master_entry_branch_id").on(table.branch_id),
    index("idx_healthcare_master_entry_domain").on(table.domain),
  ],
);

export const healthcareSeedRun = pgTable(
  "healthcare_seed_run",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    preset: text().notNull(),
    status: text().notNull().default("seeded"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_seed_run_branch_id").on(table.branch_id),
    index("idx_healthcare_seed_run_preset").on(table.preset),
  ],
);

export type HealthcareReportDefinition = typeof healthcareReportDefinition.$inferSelect;
export type NewHealthcareReportDefinition = typeof healthcareReportDefinition.$inferInsert;
export type HealthcareComplianceEvidence = typeof healthcareComplianceEvidence.$inferSelect;
export type NewHealthcareComplianceEvidence = typeof healthcareComplianceEvidence.$inferInsert;
export type HealthcareMasterEntry = typeof healthcareMasterEntry.$inferSelect;
export type NewHealthcareMasterEntry = typeof healthcareMasterEntry.$inferInsert;
export type HealthcareSeedRun = typeof healthcareSeedRun.$inferSelect;
export type NewHealthcareSeedRun = typeof healthcareSeedRun.$inferInsert;

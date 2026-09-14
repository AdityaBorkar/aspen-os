import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const healthcareCompany = pgTable(
  "healthcare_company",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    logo: text(),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    slug: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_healthcare_company_branch_id").on(table.branch_id)],
);

export type HealthcareCompany = typeof healthcareCompany.$inferSelect;
export type NewHealthcareCompany = typeof healthcareCompany.$inferInsert;

export const healthcareRole = pgTable(
  "healthcare_role",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    permissions: text().array().notNull().default([]),
    status: text().notNull().default("active"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_role_branch_id").on(table.branch_id),
    index("idx_healthcare_role_status").on(table.status),
  ],
);

export type HealthcareRole = typeof healthcareRole.$inferSelect;
export type NewHealthcareRole = typeof healthcareRole.$inferInsert;

export const healthcareMasterVersion = pgTable(
  "healthcare_master_version",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    domain: text().notNull(),
    id: uuidv7().primaryKey(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    version: text().notNull(),
  },
  (table) => [
    index("idx_healthcare_master_version_branch_id").on(table.branch_id),
    index("idx_healthcare_master_version_domain").on(table.domain),
  ],
);

export type HealthcareMasterVersion = typeof healthcareMasterVersion.$inferSelect;
export type NewHealthcareMasterVersion = typeof healthcareMasterVersion.$inferInsert;

export const healthcareTemplate = pgTable(
  "healthcare_template",
  {
    body: text().notNull(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    kind: text().notNull(),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull().default("active"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_template_branch_id").on(table.branch_id),
    index("idx_healthcare_template_kind").on(table.kind),
    index("idx_healthcare_template_status").on(table.status),
  ],
);

export type HealthcareTemplate = typeof healthcareTemplate.$inferSelect;
export type NewHealthcareTemplate = typeof healthcareTemplate.$inferInsert;

export const healthcareRecallRule = pgTable(
  "healthcare_recall_rule",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    days_after: integer().notNull(),
    id: uuidv7().primaryKey(),
    message: text().notNull(),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    status: text().notNull().default("active"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_recall_rule_branch_id").on(table.branch_id),
    index("idx_healthcare_recall_rule_status").on(table.status),
  ],
);

export type HealthcareRecallRule = typeof healthcareRecallRule.$inferSelect;
export type NewHealthcareRecallRule = typeof healthcareRecallRule.$inferInsert;

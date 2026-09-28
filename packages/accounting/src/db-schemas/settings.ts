import { uuidv7 } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export interface JournalTemplateLine {
  accountId: string;
  credit?: number;
  debit?: number;
  partyId?: string | null;
  partyType?: string | null;
}

export const accountingTermsTemplate = pgTable(
  "accounting_terms_template",
  {
    content: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_accounting_terms_template_name").on(table.name)],
);

export const accountingJournalTemplate = pgTable(
  "accounting_journal_template",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    entry_type: text().notNull().default("journal"),
    id: uuidv7().primaryKey(),
    lines: jsonb().$type<JournalTemplateLine[]>().notNull().default([]),
    name: text().notNull(),
    narration: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_accounting_journal_template_name").on(table.name)],
);

export type AccountingTermsTemplate = typeof accountingTermsTemplate.$inferSelect;
export type NewAccountingTermsTemplate = typeof accountingTermsTemplate.$inferInsert;
export type AccountingJournalTemplate = typeof accountingJournalTemplate.$inferSelect;
export type NewAccountingJournalTemplate = typeof accountingJournalTemplate.$inferInsert;

export interface TermsTemplateMetadata {
  name: string;
}

export type TermsMetadata = Record<string, JsonValue>;

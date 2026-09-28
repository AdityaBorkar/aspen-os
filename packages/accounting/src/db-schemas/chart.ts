import {
  accountingAccountTypeEnum,
  accountingDocStatusEnum,
  accountingFiscalYearStatusEnum,
  accountingJournalTypeEnum,
  accountingPartyTypeEnum,
  accountingRootTypeEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, date, index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const accountingAccount = pgTable(
  "accounting_account",
  {
    account_number: text(),
    account_type: accountingAccountTypeEnum().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_disabled: boolean().notNull().default(false),
    is_group: boolean().notNull().default(false),
    name: text().notNull(),
    parent_id: text(),
    root_type: accountingRootTypeEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_accounting_account_parent_id").on(table.parent_id),
    index("idx_accounting_account_root_type").on(table.root_type),
    index("idx_accounting_account_account_type").on(table.account_type),
  ],
);

export const accountingFiscalYear = pgTable(
  "accounting_fiscal_year",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    end_date: date().notNull(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    start_date: date().notNull(),
    status: accountingFiscalYearStatusEnum().notNull().default("open"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_accounting_fiscal_year_status").on(table.status),
    index("idx_accounting_fiscal_year_start_date").on(table.start_date),
  ],
);

export const accountingJournalEntry = pgTable(
  "accounting_journal_entry",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    entry_type: accountingJournalTypeEnum().notNull().default("journal"),
    fiscal_year: text(),
    id: uuidv7().primaryKey(),
    is_advance: boolean().notNull().default(false),
    narration: text(),
    posting_date: date().notNull(),
    reference_id: text(),
    reference_type: text(),
    reversed_by: text(),
    reverses: text(),
    status: accountingDocStatusEnum().notNull().default("draft"),
    total_credit: numeric().notNull().default("0"),
    total_debit: numeric().notNull().default("0"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_accounting_journal_entry_posting_date").on(table.posting_date),
    index("idx_accounting_journal_entry_status").on(table.status),
    index("idx_accounting_journal_entry_entry_type").on(table.entry_type),
  ],
);

export const accountingJournalLine = pgTable(
  "accounting_journal_line",
  {
    account_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    credit: numeric().notNull().default("0"),
    debit: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    is_advance: boolean().notNull().default(false),
    journal_id: text().notNull(),
    party_id: text(),
    party_type: accountingPartyTypeEnum(),
    reference_id: text(),
    reference_type: text(),
  },
  (table) => [
    index("idx_accounting_journal_line_journal_id").on(table.journal_id),
    index("idx_accounting_journal_line_account_id").on(table.account_id),
    index("idx_accounting_journal_line_party_id").on(table.party_id),
  ],
);

export const accountingGlEntry = pgTable(
  "accounting_gl_entry",
  {
    account_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    credit: numeric().notNull().default("0"),
    debit: numeric().notNull().default("0"),
    fiscal_year: text().notNull(),
    id: uuidv7().primaryKey(),
    party_id: text(),
    party_type: accountingPartyTypeEnum(),
    posting_date: date().notNull(),
    voucher_id: text().notNull(),
    voucher_type: text().notNull(),
  },
  (table) => [
    index("idx_accounting_gl_entry_voucher_id").on(table.voucher_id),
    index("idx_accounting_gl_entry_account_id").on(table.account_id),
    index("idx_accounting_gl_entry_posting_date").on(table.posting_date),
    index("idx_accounting_gl_entry_party_id").on(table.party_id),
    index("idx_accounting_gl_entry_fiscal_year").on(table.fiscal_year),
  ],
);

export type AccountingAccount = typeof accountingAccount.$inferSelect;
export type NewAccountingAccount = typeof accountingAccount.$inferInsert;
export type AccountingFiscalYear = typeof accountingFiscalYear.$inferSelect;
export type NewAccountingFiscalYear = typeof accountingFiscalYear.$inferInsert;
export type AccountingJournalEntry = typeof accountingJournalEntry.$inferSelect;
export type NewAccountingJournalEntry = typeof accountingJournalEntry.$inferInsert;
export type AccountingJournalLine = typeof accountingJournalLine.$inferSelect;
export type NewAccountingJournalLine = typeof accountingJournalLine.$inferInsert;
export type AccountingGlEntry = typeof accountingGlEntry.$inferSelect;
export type NewAccountingGlEntry = typeof accountingGlEntry.$inferInsert;

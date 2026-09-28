import {
  accountingBankMatchStatusEnum,
  accountingDocStatusEnum,
  accountingPartyTypeEnum,
  accountingPaymentTypeEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const accountingPaymentEntry = pgTable(
  "accounting_payment_entry",
  {
    allocated_amount: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    file_id: text(),
    id: uuidv7().primaryKey(),
    mode_of_payment: text(),
    paid_amount: numeric().notNull().default("0"),
    paid_from: text(),
    paid_to: text(),
    party_id: text(),
    party_type: accountingPartyTypeEnum(),
    payment_type: accountingPaymentTypeEnum().notNull(),
    posting_date: date().notNull(),
    reference_date: date(),
    reference_no: text(),
    status: accountingDocStatusEnum().notNull().default("draft"),
    unallocated_amount: numeric().notNull().default("0"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_accounting_payment_entry_party_id").on(table.party_id),
    index("idx_accounting_payment_entry_posting_date").on(table.posting_date),
    index("idx_accounting_payment_entry_status").on(table.status),
  ],
);

export const accountingPaymentReference = pgTable(
  "accounting_payment_reference",
  {
    allocated_amount: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    payment_id: text().notNull(),
    reference_id: text().notNull(),
    reference_type: text().notNull(),
  },
  (table) => [
    index("idx_accounting_payment_reference_payment_id").on(table.payment_id),
    index("idx_accounting_payment_reference_reference_id").on(table.reference_id),
  ],
);

export const accountingBankStatementLine = pgTable(
  "accounting_bank_statement_line",
  {
    amount: numeric().notNull().default("0"),
    bank_account: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    description: text(),
    id: uuidv7().primaryKey(),
    match_status: accountingBankMatchStatusEnum().notNull().default("unmatched"),
    matched_payment_id: text(),
    reference_no: text(),
    statement_date: date().notNull(),
  },
  (table) => [
    index("idx_accounting_bank_statement_line_bank_account").on(table.bank_account),
    index("idx_accounting_bank_statement_line_statement_date").on(table.statement_date),
    index("idx_accounting_bank_statement_line_match_status").on(table.match_status),
  ],
);

export type AccountingPaymentEntry = typeof accountingPaymentEntry.$inferSelect;
export type NewAccountingPaymentEntry = typeof accountingPaymentEntry.$inferInsert;
export type AccountingPaymentReference = typeof accountingPaymentReference.$inferSelect;
export type NewAccountingPaymentReference = typeof accountingPaymentReference.$inferInsert;
export type AccountingBankStatementLine = typeof accountingBankStatementLine.$inferSelect;
export type NewAccountingBankStatementLine = typeof accountingBankStatementLine.$inferInsert;

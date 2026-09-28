import { accountingChargeTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export interface PaymentTermScheduleLine {
  daysAfter: number;
  percent: number;
}

export const accountingTaxTemplate = pgTable(
  "accounting_tax_template",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    is_sales: boolean().notNull().default(true),
    name: text().notNull(),
    tax_category: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_accounting_tax_template_name").on(table.name)],
);

export const accountingTaxRule = pgTable(
  "accounting_tax_rule",
  {
    account_head: text().notNull(),
    charge_type: accountingChargeTypeEnum().notNull().default("on_net_total"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    description: text(),
    id: uuidv7().primaryKey(),
    rate: numeric().notNull().default("0"),
    row_index: integer().notNull().default(0),
    template_id: text().notNull(),
  },
  (table) => [
    index("idx_accounting_tax_rule_template_id").on(table.template_id),
    index("idx_accounting_tax_rule_account_head").on(table.account_head),
  ],
);

export const accountingPaymentTermTemplate = pgTable(
  "accounting_payment_term_template",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    schedule: jsonb().$type<PaymentTermScheduleLine[]>().notNull().default([]),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_accounting_payment_term_template_name").on(table.name)],
);

export type AccountingTaxTemplate = typeof accountingTaxTemplate.$inferSelect;
export type NewAccountingTaxTemplate = typeof accountingTaxTemplate.$inferInsert;
export type AccountingTaxRule = typeof accountingTaxRule.$inferSelect;
export type NewAccountingTaxRule = typeof accountingTaxRule.$inferInsert;
export type AccountingPaymentTermTemplate = typeof accountingPaymentTermTemplate.$inferSelect;
export type NewAccountingPaymentTermTemplate = typeof accountingPaymentTermTemplate.$inferInsert;

import { healthcareInvoiceStatusEnum } from "#/db-schemas/enums";

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export interface HealthcareInvoiceLine {
  price: number;
  qty: number;
  serviceId: string;
  source: string;
}

export interface HealthcarePricelistRate {
  price: number;
  serviceId: string;
}

export const healthcareInvoice = pgTable(
  "healthcare_invoice",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    discount_pct: numeric().notNull().default("0"),
    encounter_id: text(),
    gst_pct: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    invoice_no: text().notNull(),
    lines: jsonb().$type<HealthcareInvoiceLine[]>().notNull().default([]),
    paid: numeric().notNull().default("0"),
    patient_id: text().notNull(),
    payer: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    pricelist_id: text(),
    status: healthcareInvoiceStatusEnum().notNull().default("draft"),
    total: numeric().notNull().default("0"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_healthcare_invoice_no").on(table.invoice_no),
    index("idx_healthcare_invoice_branch_id").on(table.branch_id),
    index("idx_healthcare_invoice_patient_id").on(table.patient_id),
    index("idx_healthcare_invoice_status").on(table.status),
  ],
);

export const healthcareReceipt = pgTable(
  "healthcare_receipt",
  {
    amount: numeric().notNull(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    invoice_id: text().notNull(),
    mode: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    receipt_no: text().notNull(),
    ref: text(),
    status: text().notNull().default("collected"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_healthcare_receipt_no").on(table.receipt_no),
    index("idx_healthcare_receipt_branch_id").on(table.branch_id),
    index("idx_healthcare_receipt_invoice_id").on(table.invoice_id),
  ],
);

export const healthcarePackageBalance = pgTable(
  "healthcare_package_balance",
  {
    balance: jsonb().$type<Record<string, number>>().notNull().default({}),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp({ withTimezone: true }),
    id: uuidv7().primaryKey(),
    package_id: text().notNull(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    price: numeric().notNull().default("0"),
    status: text().notNull().default("active"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    validity_days: integer().notNull().default(180),
  },
  (table) => [
    index("idx_healthcare_package_balance_branch_id").on(table.branch_id),
    index("idx_healthcare_package_balance_package_id").on(table.package_id),
    index("idx_healthcare_package_balance_patient_id").on(table.patient_id),
    index("idx_healthcare_package_balance_status").on(table.status),
  ],
);

export const healthcarePricelist = pgTable(
  "healthcare_pricelist",
  {
    branch_id: text().notNull().default("main"),
    code: text().notNull().default("standard"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    currency: text().notNull().default("INR"),
    effective_from: date(),
    effective_to: date(),
    id: uuidv7().primaryKey(),
    is_default: boolean().notNull().default(false),
    name: text().notNull(),
    payer: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    rates: jsonb().$type<HealthcarePricelistRate[]>().notNull().default([]),
    scope: text().notNull().default("branch"),
    status: text().notNull().default("draft"),
    tax_inclusive: boolean().notNull().default(true),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    version: integer().notNull().default(1),
  },
  (table) => [
    index("idx_healthcare_pricelist_branch_code").on(table.branch_id, table.code),
    index("idx_healthcare_pricelist_branch_id").on(table.branch_id),
    index("idx_healthcare_pricelist_name").on(table.name),
    index("idx_healthcare_pricelist_status").on(table.status),
  ],
);

export const healthcareCreditDebitNote = pgTable(
  "healthcare_credit_debit_note",
  {
    amount: numeric().notNull(),
    approver: text(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    invoice_id: text().notNull(),
    kind: text().notNull(),
    note_no: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    reason: text(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_healthcare_credit_debit_note_no").on(table.note_no),
    index("idx_healthcare_credit_debit_note_branch_id").on(table.branch_id),
    index("idx_healthcare_credit_debit_note_invoice_id").on(table.invoice_id),
  ],
);

export const healthcareAdvance = pgTable(
  "healthcare_advance",
  {
    amount: numeric().notNull(),
    balance: numeric().notNull(),
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    direction: text().notNull(),
    id: uuidv7().primaryKey(),
    patient_id: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_advance_branch_id").on(table.branch_id),
    index("idx_healthcare_advance_patient_id").on(table.patient_id),
  ],
);

export type HealthcareInvoice = typeof healthcareInvoice.$inferSelect;
export type NewHealthcareInvoice = typeof healthcareInvoice.$inferInsert;
export type HealthcareReceipt = typeof healthcareReceipt.$inferSelect;
export type NewHealthcareReceipt = typeof healthcareReceipt.$inferInsert;
export type HealthcarePackageBalance = typeof healthcarePackageBalance.$inferSelect;
export type NewHealthcarePackageBalance = typeof healthcarePackageBalance.$inferInsert;
export type HealthcarePricelist = typeof healthcarePricelist.$inferSelect;
export type NewHealthcarePricelist = typeof healthcarePricelist.$inferInsert;
export type HealthcareCreditDebitNote = typeof healthcareCreditDebitNote.$inferSelect;
export type NewHealthcareCreditDebitNote = typeof healthcareCreditDebitNote.$inferInsert;
export type HealthcareAdvance = typeof healthcareAdvance.$inferSelect;
export type NewHealthcareAdvance = typeof healthcareAdvance.$inferInsert;

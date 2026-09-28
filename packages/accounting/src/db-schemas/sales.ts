import {
  accountingDocStatusEnum,
  accountingInvoiceStatusEnum,
  accountingOrderStatusEnum,
  accountingQuotationStatusEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, date, index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const accountingQuotation = pgTable(
  "accounting_quotation",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    currency: text().notNull().default("INR"),
    file_id: text(),
    grand_total: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    net_total: numeric().notNull().default("0"),
    party_id: text().notNull(),
    party_type: text().notNull().default("customer"),
    posting_date: date().notNull(),
    status: accountingQuotationStatusEnum().notNull().default("draft"),
    tax_template_id: text(),
    tax_total: numeric().notNull().default("0"),
    terms_text: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    valid_until: date(),
  },
  (table) => [
    index("idx_accounting_quotation_party_id").on(table.party_id),
    index("idx_accounting_quotation_status").on(table.status),
  ],
);

export const accountingQuotationItem = pgTable(
  "accounting_quotation_item",
  {
    amount: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    discount_amount: numeric().notNull().default("0"),
    discount_percent: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    item_name: text(),
    item_tax_template_id: text(),
    qty: numeric().notNull().default("1"),
    quotation_id: text().notNull(),
    rate: numeric().notNull().default("0"),
    uom: text(),
    uom_factor: numeric().notNull().default("1"),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_accounting_quotation_item_quotation_id").on(table.quotation_id),
    index("idx_accounting_quotation_item_item_id").on(table.item_id),
  ],
);

export const accountingSalesOrder = pgTable(
  "accounting_sales_order",
  {
    billed_percent: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    currency: text().notNull().default("INR"),
    customer_id: text().notNull(),
    customer_po_date: date(),
    customer_po_no: text(),
    delivered_percent: numeric().notNull().default("0"),
    delivery_date: date(),
    file_id: text(),
    grand_total: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    net_total: numeric().notNull().default("0"),
    payment_terms_template_id: text(),
    quotation_id: text(),
    status: accountingOrderStatusEnum().notNull().default("draft"),
    tax_template_id: text(),
    tax_total: numeric().notNull().default("0"),
    terms_text: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_accounting_sales_order_customer_id").on(table.customer_id),
    index("idx_accounting_sales_order_status").on(table.status),
  ],
);

export const accountingSalesOrderItem = pgTable(
  "accounting_sales_order_item",
  {
    amount: numeric().notNull().default("0"),
    billed_qty: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    delivered_qty: numeric().notNull().default("0"),
    delivery_date: date(),
    discount_amount: numeric().notNull().default("0"),
    discount_percent: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    income_account: text(),
    item_id: text().notNull(),
    item_name: text(),
    item_tax_template_id: text(),
    qty: numeric().notNull().default("1"),
    rate: numeric().notNull().default("0"),
    sales_order_id: text().notNull(),
    uom: text(),
    uom_factor: numeric().notNull().default("1"),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_accounting_sales_order_item_sales_order_id").on(table.sales_order_id),
    index("idx_accounting_sales_order_item_item_id").on(table.item_id),
  ],
);

export const accountingDeliveryNote = pgTable(
  "accounting_delivery_note",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    customer_id: text().notNull(),
    file_id: text(),
    id: uuidv7().primaryKey(),
    posting_date: date().notNull(),
    sales_order_id: text(),
    status: accountingDocStatusEnum().notNull().default("draft"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_accounting_delivery_note_customer_id").on(table.customer_id),
    index("idx_accounting_delivery_note_sales_order_id").on(table.sales_order_id),
    index("idx_accounting_delivery_note_posting_date").on(table.posting_date),
  ],
);

export const accountingDeliveryItem = pgTable(
  "accounting_delivery_item",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    delivery_id: text().notNull(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    qty: numeric().notNull().default("1"),
    sales_order_id: text(),
    sales_order_item_id: text(),
    uom: text(),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_accounting_delivery_item_delivery_id").on(table.delivery_id),
    index("idx_accounting_delivery_item_item_id").on(table.item_id),
  ],
);

export const accountingSalesInvoice = pgTable(
  "accounting_sales_invoice",
  {
    allocated_amount: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    currency: text().notNull().default("INR"),
    customer_id: text().notNull(),
    customer_po_date: date(),
    customer_po_no: text(),
    delivery_id: text(),
    due_date: date(),
    file_id: text(),
    grand_total: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    is_rate_adjustment: boolean().notNull().default(false),
    is_return: boolean().notNull().default(false),
    net_total: numeric().notNull().default("0"),
    outstanding_amount: numeric().notNull().default("0"),
    payment_terms_template_id: text(),
    posting_date: date().notNull(),
    return_against: text(),
    sales_order_id: text(),
    status: accountingInvoiceStatusEnum().notNull().default("draft"),
    tax_template_id: text(),
    tax_total: numeric().notNull().default("0"),
    terms_text: text(),
    update_stock: boolean().notNull().default(false),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    warehouse_id: text(),
    written_off_amount: numeric().notNull().default("0"),
  },
  (table) => [
    index("idx_accounting_sales_invoice_customer_id").on(table.customer_id),
    index("idx_accounting_sales_invoice_status").on(table.status),
    index("idx_accounting_sales_invoice_posting_date").on(table.posting_date),
    index("idx_accounting_sales_invoice_sales_order_id").on(table.sales_order_id),
  ],
);

export const accountingSalesInvoiceItem = pgTable(
  "accounting_sales_invoice_item",
  {
    amount: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    delivery_id: text(),
    discount_amount: numeric().notNull().default("0"),
    discount_percent: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    income_account: text(),
    item_id: text().notNull(),
    item_name: text(),
    item_tax_template_id: text(),
    qty: numeric().notNull().default("1"),
    rate: numeric().notNull().default("0"),
    sales_invoice_id: text().notNull(),
    sales_order_id: text(),
    sales_order_item_id: text(),
    uom: text(),
    uom_factor: numeric().notNull().default("1"),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_accounting_sales_invoice_item_sales_invoice_id").on(table.sales_invoice_id),
    index("idx_accounting_sales_invoice_item_item_id").on(table.item_id),
  ],
);

export type AccountingQuotation = typeof accountingQuotation.$inferSelect;
export type NewAccountingQuotation = typeof accountingQuotation.$inferInsert;
export type AccountingQuotationItem = typeof accountingQuotationItem.$inferSelect;
export type NewAccountingQuotationItem = typeof accountingQuotationItem.$inferInsert;
export type AccountingSalesOrder = typeof accountingSalesOrder.$inferSelect;
export type NewAccountingSalesOrder = typeof accountingSalesOrder.$inferInsert;
export type AccountingSalesOrderItem = typeof accountingSalesOrderItem.$inferSelect;
export type NewAccountingSalesOrderItem = typeof accountingSalesOrderItem.$inferInsert;
export type AccountingDeliveryNote = typeof accountingDeliveryNote.$inferSelect;
export type NewAccountingDeliveryNote = typeof accountingDeliveryNote.$inferInsert;
export type AccountingDeliveryItem = typeof accountingDeliveryItem.$inferSelect;
export type NewAccountingDeliveryItem = typeof accountingDeliveryItem.$inferInsert;
export type AccountingSalesInvoice = typeof accountingSalesInvoice.$inferSelect;
export type NewAccountingSalesInvoice = typeof accountingSalesInvoice.$inferInsert;
export type AccountingSalesInvoiceItem = typeof accountingSalesInvoiceItem.$inferSelect;
export type NewAccountingSalesInvoiceItem = typeof accountingSalesInvoiceItem.$inferInsert;

import {
  accountingDocStatusEnum,
  accountingInvoiceStatusEnum,
  accountingMaterialRequestTypeEnum,
  accountingOrderStatusEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Single-owner snapshots: products owns items/UOMs/prices/reorder policy,
// inventory owns warehouses/stock/breaches. Purchase docs store snapshots
// only — material requests are created off inventory.reorder_triggered,
// never by a local reorder scan.
export const accountingMaterialRequest = pgTable(
  "accounting_material_request",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    department: text(),
    id: uuidv7().primaryKey(),
    request_type: accountingMaterialRequestTypeEnum().notNull().default("purchase"),
    required_by: date(),
    status: accountingDocStatusEnum().notNull().default("draft"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_accounting_material_request_status").on(table.status)],
);

export const accountingMaterialRequestItem = pgTable(
  "accounting_material_request_item",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    material_request_id: text().notNull(),
    qty: numeric().notNull().default("1"),
    required_by: date(),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_accounting_material_request_item_material_request_id").on(table.material_request_id),
    index("idx_accounting_material_request_item_item_id").on(table.item_id),
  ],
);

export const accountingRfq = pgTable(
  "accounting_rfq",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    deadline: date(),
    id: uuidv7().primaryKey(),
    material_request_id: text(),
    required_by: date(),
    status: accountingDocStatusEnum().notNull().default("draft"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_accounting_rfq_status").on(table.status)],
);

export const accountingRfqItem = pgTable(
  "accounting_rfq_item",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    qty: numeric().notNull().default("1"),
    rfq_id: text().notNull(),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_accounting_rfq_item_rfq_id").on(table.rfq_id),
    index("idx_accounting_rfq_item_item_id").on(table.item_id),
  ],
);

export const accountingSupplierQuotation = pgTable(
  "accounting_supplier_quotation",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    grand_total: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    net_total: numeric().notNull().default("0"),
    rfq_id: text(),
    status: accountingDocStatusEnum().notNull().default("draft"),
    supplier_id: text().notNull(),
    tax_template_id: text(),
    tax_total: numeric().notNull().default("0"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    valid_until: date(),
  },
  (table) => [
    index("idx_accounting_supplier_quotation_supplier_id").on(table.supplier_id),
    index("idx_accounting_supplier_quotation_rfq_id").on(table.rfq_id),
    index("idx_accounting_supplier_quotation_status").on(table.status),
  ],
);

export const accountingSupplierQuotationItem = pgTable(
  "accounting_supplier_quotation_item",
  {
    amount: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    item_tax_template_id: text(),
    qty: numeric().notNull().default("1"),
    rate: numeric().notNull().default("0"),
    rfq_item_id: text(),
    supplier_quotation_id: text().notNull(),
  },
  (table) => [
    index("idx_accounting_supplier_quotation_item_supplier_quotation_id").on(
      table.supplier_quotation_id,
    ),
    index("idx_accounting_supplier_quotation_item_item_id").on(table.item_id),
  ],
);

export const accountingPurchaseOrder = pgTable(
  "accounting_purchase_order",
  {
    billed_percent: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    currency: text().notNull().default("INR"),
    file_id: text(),
    grand_total: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    material_request_id: text(),
    net_total: numeric().notNull().default("0"),
    payment_terms_template_id: text(),
    received_percent: numeric().notNull().default("0"),
    required_by: date(),
    status: accountingOrderStatusEnum().notNull().default("draft"),
    supplier_id: text().notNull(),
    supplier_quotation_id: text(),
    tax_template_id: text(),
    tax_total: numeric().notNull().default("0"),
    terms_text: text(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_accounting_purchase_order_supplier_id").on(table.supplier_id),
    index("idx_accounting_purchase_order_status").on(table.status),
  ],
);

export const accountingPurchaseOrderItem = pgTable(
  "accounting_purchase_order_item",
  {
    amount: numeric().notNull().default("0"),
    billed_qty: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    discount_amount: numeric().notNull().default("0"),
    discount_percent: numeric().notNull().default("0"),
    expense_account: text(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    item_name: text(),
    item_tax_template_id: text(),
    purchase_order_id: text().notNull(),
    qty: numeric().notNull().default("1"),
    rate: numeric().notNull().default("0"),
    received_qty: numeric().notNull().default("0"),
    required_by: date(),
    uom: text(),
    uom_factor: numeric().notNull().default("1"),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_accounting_purchase_order_item_purchase_order_id").on(table.purchase_order_id),
    index("idx_accounting_purchase_order_item_item_id").on(table.item_id),
  ],
);

export const accountingReceiptNote = pgTable(
  "accounting_receipt_note",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    file_id: text(),
    id: uuidv7().primaryKey(),
    posting_date: date().notNull(),
    purchase_order_id: text(),
    quality_notes: text(),
    status: accountingDocStatusEnum().notNull().default("draft"),
    supplier_id: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_accounting_receipt_note_supplier_id").on(table.supplier_id),
    index("idx_accounting_receipt_note_purchase_order_id").on(table.purchase_order_id),
    index("idx_accounting_receipt_note_posting_date").on(table.posting_date),
  ],
);

export const accountingReceiptItem = pgTable(
  "accounting_receipt_item",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    purchase_order_id: text(),
    purchase_order_item_id: text(),
    qty: numeric().notNull().default("1"),
    receipt_id: text().notNull(),
    uom: text(),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_accounting_receipt_item_receipt_id").on(table.receipt_id),
    index("idx_accounting_receipt_item_item_id").on(table.item_id),
  ],
);

export const accountingPurchaseInvoice = pgTable(
  "accounting_purchase_invoice",
  {
    allocated_amount: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    credit_to: text(),
    currency: text().notNull().default("INR"),
    due_date: date(),
    file_id: text(),
    grand_total: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    is_return: boolean().notNull().default(false),
    net_total: numeric().notNull().default("0"),
    on_hold: boolean().notNull().default(false),
    outstanding_amount: numeric().notNull().default("0"),
    posting_date: date().notNull(),
    purchase_order_id: text(),
    receipt_id: text(),
    return_against: text(),
    status: accountingInvoiceStatusEnum().notNull().default("draft"),
    supplier_id: text().notNull(),
    supplier_invoice_date: date(),
    supplier_invoice_no: text(),
    tax_template_id: text(),
    tax_total: numeric().notNull().default("0"),
    terms_text: text(),
    update_stock: boolean().notNull().default(false),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    withholding_rate: numeric().notNull().default("0"),
    written_off_amount: numeric().notNull().default("0"),
  },
  (table) => [
    index("idx_accounting_purchase_invoice_supplier_id").on(table.supplier_id),
    index("idx_accounting_purchase_invoice_status").on(table.status),
    index("idx_accounting_purchase_invoice_posting_date").on(table.posting_date),
    index("idx_accounting_purchase_invoice_purchase_order_id").on(table.purchase_order_id),
    uniqueIndex("idx_accounting_purchase_invoice_supplier_bill").on(
      table.supplier_id,
      table.supplier_invoice_no,
    ),
  ],
);

export const accountingPurchaseInvoiceItem = pgTable(
  "accounting_purchase_invoice_item",
  {
    amount: numeric().notNull().default("0"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    discount_amount: numeric().notNull().default("0"),
    discount_percent: numeric().notNull().default("0"),
    expense_account: text(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    item_name: text(),
    item_tax_template_id: text(),
    purchase_invoice_id: text().notNull(),
    purchase_order_id: text(),
    purchase_order_item_id: text(),
    qty: numeric().notNull().default("1"),
    rate: numeric().notNull().default("0"),
    receipt_id: text(),
    uom: text(),
    uom_factor: numeric().notNull().default("1"),
    warehouse_id: text(),
  },
  (table) => [
    index("idx_accounting_purchase_invoice_item_purchase_invoice_id").on(table.purchase_invoice_id),
    index("idx_accounting_purchase_invoice_item_item_id").on(table.item_id),
  ],
);

export type AccountingMaterialRequest = typeof accountingMaterialRequest.$inferSelect;
export type NewAccountingMaterialRequest = typeof accountingMaterialRequest.$inferInsert;
export type AccountingMaterialRequestItem = typeof accountingMaterialRequestItem.$inferSelect;
export type NewAccountingMaterialRequestItem = typeof accountingMaterialRequestItem.$inferInsert;
export type AccountingRfq = typeof accountingRfq.$inferSelect;
export type NewAccountingRfq = typeof accountingRfq.$inferInsert;
export type AccountingRfqItem = typeof accountingRfqItem.$inferSelect;
export type NewAccountingRfqItem = typeof accountingRfqItem.$inferInsert;
export type AccountingSupplierQuotation = typeof accountingSupplierQuotation.$inferSelect;
export type NewAccountingSupplierQuotation = typeof accountingSupplierQuotation.$inferInsert;
export type AccountingSupplierQuotationItem = typeof accountingSupplierQuotationItem.$inferSelect;
export type NewAccountingSupplierQuotationItem =
  typeof accountingSupplierQuotationItem.$inferInsert;
export type AccountingPurchaseOrder = typeof accountingPurchaseOrder.$inferSelect;
export type NewAccountingPurchaseOrder = typeof accountingPurchaseOrder.$inferInsert;
export type AccountingPurchaseOrderItem = typeof accountingPurchaseOrderItem.$inferSelect;
export type NewAccountingPurchaseOrderItem = typeof accountingPurchaseOrderItem.$inferInsert;
export type AccountingReceiptNote = typeof accountingReceiptNote.$inferSelect;
export type NewAccountingReceiptNote = typeof accountingReceiptNote.$inferInsert;
export type AccountingReceiptItem = typeof accountingReceiptItem.$inferSelect;
export type NewAccountingReceiptItem = typeof accountingReceiptItem.$inferInsert;
export type AccountingPurchaseInvoice = typeof accountingPurchaseInvoice.$inferSelect;
export type NewAccountingPurchaseInvoice = typeof accountingPurchaseInvoice.$inferInsert;
export type AccountingPurchaseInvoiceItem = typeof accountingPurchaseInvoiceItem.$inferSelect;
export type NewAccountingPurchaseInvoiceItem = typeof accountingPurchaseInvoiceItem.$inferInsert;

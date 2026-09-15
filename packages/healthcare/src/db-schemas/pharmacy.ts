import {
  healthcareBatchStatusEnum,
  healthcareGrnStatusEnum,
  healthcarePoStatusEnum,
  healthcareSaleStatusEnum,
} from "#/db-schemas/enums";

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

function timestamps() {
  return {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  };
}

function branchCol() {
  return { branch_id: text().notNull().default("main") };
}

function payloadCol() {
  return { payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}) };
}

export const healthcarePharmacyItem = pgTable(
  "healthcare_pharmacy_item",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    gst_pct: numeric(),
    hsn: text(),
    id: uuidv7().primaryKey(),
    name: text().notNull(),
    pack: text().notNull(),
    reference_uom_category: text(),
    reference_uom_id: text(),
    reorder_level: integer().notNull().default(0),
    salt: text().notNull(),
    schedule: text().notNull(),
    strength: text().notNull(),
  },
  (table) => [
    uniqueIndex("idx_healthcare_pharmacy_item_unique").on(table.salt, table.strength, table.pack),
    index("idx_healthcare_pharmacy_item_branch_id").on(table.branch_id),
    index("idx_healthcare_pharmacy_item_name").on(table.name),
    index("idx_healthcare_pharmacy_item_salt").on(table.salt),
    index("idx_healthcare_pharmacy_item_schedule").on(table.schedule),
  ],
);

export type HealthcarePharmacyItem = typeof healthcarePharmacyItem.$inferSelect;
export type NewHealthcarePharmacyItem = typeof healthcarePharmacyItem.$inferInsert;

export const healthcarePharmacyBatch = pgTable(
  "healthcare_pharmacy_batch",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    expiry: date().notNull(),
    id: uuidv7().primaryKey(),
    item_id: text().notNull(),
    location: text().notNull().default("main-store"),
    lot: text().notNull(),
    mrp: numeric().notNull(),
    qty: integer().notNull().default(0),
    rate: numeric().notNull(),
    status: healthcareBatchStatusEnum().notNull().default("active"),
  },
  (table) => [
    uniqueIndex("idx_healthcare_pharmacy_batch_unique").on(table.item_id, table.lot),
    index("idx_healthcare_pharmacy_batch_branch_id").on(table.branch_id),
    index("idx_healthcare_pharmacy_batch_item_id").on(table.item_id),
    index("idx_healthcare_pharmacy_batch_expiry").on(table.expiry),
    index("idx_healthcare_pharmacy_batch_status").on(table.status),
  ],
);

export type HealthcarePharmacyBatch = typeof healthcarePharmacyBatch.$inferSelect;
export type NewHealthcarePharmacyBatch = typeof healthcarePharmacyBatch.$inferInsert;

export const healthcarePharmacySale = pgTable(
  "healthcare_pharmacy_sale",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    id: uuidv7().primaryKey(),
    mode: text().notNull(),
    patient_id: text().notNull(),
    prescription_id: text(),
    sale_no: text().notNull(),
    status: healthcareSaleStatusEnum().notNull().default("pending"),
    total: numeric().notNull().default("0"),
  },
  (table) => [
    uniqueIndex("idx_healthcare_pharmacy_sale_no").on(table.sale_no),
    index("idx_healthcare_pharmacy_sale_branch_id").on(table.branch_id),
    index("idx_healthcare_pharmacy_sale_patient_id").on(table.patient_id),
    index("idx_healthcare_pharmacy_sale_prescription_id").on(table.prescription_id),
    index("idx_healthcare_pharmacy_sale_status").on(table.status),
  ],
);

export type HealthcarePharmacySale = typeof healthcarePharmacySale.$inferSelect;
export type NewHealthcarePharmacySale = typeof healthcarePharmacySale.$inferInsert;

export const healthcarePharmacyReturn = pgTable(
  "healthcare_pharmacy_return",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    id: uuidv7().primaryKey(),
    original_bill_id: text().notNull(),
    reason: text().notNull(),
    return_no: text().notNull(),
    status: text().notNull().default("accepted"),
  },
  (table) => [
    uniqueIndex("idx_healthcare_pharmacy_return_no").on(table.return_no),
    index("idx_healthcare_pharmacy_return_branch_id").on(table.branch_id),
    index("idx_healthcare_pharmacy_return_original_bill_id").on(table.original_bill_id),
    index("idx_healthcare_pharmacy_return_status").on(table.status),
  ],
);

export type HealthcarePharmacyReturn = typeof healthcarePharmacyReturn.$inferSelect;
export type NewHealthcarePharmacyReturn = typeof healthcarePharmacyReturn.$inferInsert;

export const healthcarePurchaseOrder = pgTable(
  "healthcare_purchase_order",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    id: uuidv7().primaryKey(),
    note: text(),
    po_no: text().notNull(),
    status: healthcarePoStatusEnum().notNull().default("draft"),
    vendor: text().notNull(),
  },
  (table) => [
    uniqueIndex("idx_healthcare_purchase_order_no").on(table.po_no),
    index("idx_healthcare_purchase_order_branch_id").on(table.branch_id),
    index("idx_healthcare_purchase_order_vendor").on(table.vendor),
    index("idx_healthcare_purchase_order_status").on(table.status),
  ],
);

export type HealthcarePurchaseOrder = typeof healthcarePurchaseOrder.$inferSelect;
export type NewHealthcarePurchaseOrder = typeof healthcarePurchaseOrder.$inferInsert;

export const healthcareGrn = pgTable(
  "healthcare_grn",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    grn_no: text().notNull(),
    id: uuidv7().primaryKey(),
    po_id: text().notNull(),
    status: healthcareGrnStatusEnum().notNull().default("open"),
    verified_by: text(),
  },
  (table) => [
    uniqueIndex("idx_healthcare_grn_no").on(table.grn_no),
    index("idx_healthcare_grn_branch_id").on(table.branch_id),
    index("idx_healthcare_grn_po_id").on(table.po_id),
    index("idx_healthcare_grn_status").on(table.status),
  ],
);

export type HealthcareGrn = typeof healthcareGrn.$inferSelect;
export type NewHealthcareGrn = typeof healthcareGrn.$inferInsert;

export const healthcarePurchaseInvoice = pgTable(
  "healthcare_purchase_invoice",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    amount: numeric().notNull(),
    grn_id: text().notNull(),
    gst_amount: numeric().notNull().default("0"),
    id: uuidv7().primaryKey(),
    invoice_no: text().notNull(),
    status: text().notNull().default("booked"),
  },
  (table) => [
    uniqueIndex("idx_healthcare_purchase_invoice_no").on(table.invoice_no),
    index("idx_healthcare_purchase_invoice_branch_id").on(table.branch_id),
    index("idx_healthcare_purchase_invoice_grn_id").on(table.grn_id),
    index("idx_healthcare_purchase_invoice_status").on(table.status),
  ],
);

export type HealthcarePurchaseInvoice = typeof healthcarePurchaseInvoice.$inferSelect;
export type NewHealthcarePurchaseInvoice = typeof healthcarePurchaseInvoice.$inferInsert;

export const healthcareStockTransfer = pgTable(
  "healthcare_stock_transfer",
  {
    ...branchCol(),
    ...timestamps(),
    ...payloadCol(),
    accepted_by: text(),
    batch_id: text(),
    from_location: text().notNull().default("store"),
    id: uuidv7().primaryKey(),
    is_accepted: boolean().notNull().default(false),
    item_id: text().notNull(),
    note: text(),
    qty: integer().notNull(),
    status: text().notNull().default("in-transit"),
    to_location: text().notNull(),
    transfer_no: text().notNull(),
  },
  (table) => [
    uniqueIndex("idx_healthcare_stock_transfer_no").on(table.transfer_no),
    index("idx_healthcare_stock_transfer_branch_id").on(table.branch_id),
    index("idx_healthcare_stock_transfer_item_id").on(table.item_id),
    index("idx_healthcare_stock_transfer_batch_id").on(table.batch_id),
    index("idx_healthcare_stock_transfer_status").on(table.status),
  ],
);

export type HealthcareStockTransfer = typeof healthcareStockTransfer.$inferSelect;
export type NewHealthcareStockTransfer = typeof healthcareStockTransfer.$inferInsert;

import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const healthcareInvoiceLine = pgTable(
  "healthcare_invoice_line",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    invoice_id: text().notNull(),
    patient_id: text(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    price: numeric().notNull(),
    qty: integer().notNull().default(1),
    service_id: text(),
    source: text(),
    status: text().notNull().default("active"),
    updated_at: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_healthcare_invoice_line_invoice_id").on(table.invoice_id),
    index("idx_healthcare_invoice_line_patient_id").on(table.patient_id),
    index("idx_healthcare_invoice_line_service_id").on(table.service_id),
  ],
);

export type HealthcareInvoiceLine = typeof healthcareInvoiceLine.$inferSelect;
export type NewHealthcareInvoiceLine = typeof healthcareInvoiceLine.$inferInsert;

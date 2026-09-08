import {
  masterCardBrandEnum,
  masterEntityTypeEnum,
  masterPaymentMethodDirectionEnum,
  masterPaymentMethodStatusEnum,
  masterPaymentMethodTypeEnum,
} from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const masterPaymentMethod = pgTable(
  "master_payment_method",
  {
    bank_account_id: text(),
    bank_name: text(),
    card_brand: masterCardBrandEnum(),
    card_expiry_month: integer(),
    card_expiry_year: integer(),
    card_last4: text(),
    cheque_series: text(),
    code: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    details: jsonb(),
    direction: masterPaymentMethodDirectionEnum().notNull(),
    entity_id: text().notNull(),
    entity_type: masterEntityTypeEnum().notNull(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    is_primary: boolean().notNull().default(false),
    metadata: jsonb(),
    name: text().notNull(),
    status: masterPaymentMethodStatusEnum().notNull().default("active"),
    type: masterPaymentMethodTypeEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    upi_id: text(),
  },
  (table) => [
    index("idx_master_payment_method_entity").on(table.entity_type, table.entity_id),
    index("idx_master_payment_method_type").on(table.type),
    index("idx_master_payment_method_is_primary").on(table.is_primary),
    index("idx_master_payment_method_is_active").on(table.is_active),
  ],
);

export type MasterPaymentMethod = typeof masterPaymentMethod.$inferSelect;
export type NewMasterPaymentMethod = typeof masterPaymentMethod.$inferInsert;

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
    bankAccountId: text("bank_account_id"),
    bankName: text("bank_name"),
    cardBrand: masterCardBrandEnum("card_brand"),
    cardExpiryMonth: integer("card_expiry_month"),
    cardExpiryYear: integer("card_expiry_year"),
    cardLast4: text("card_last4"),
    chequeSeries: text("cheque_series"),
    code: text("code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    details: jsonb("details"),
    direction: masterPaymentMethodDirectionEnum("direction").notNull(),
    entityId: text("entity_id").notNull(),
    entityType: masterEntityTypeEnum("entity_type").notNull(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isActive: boolean("is_active").notNull().default(true),
    isPrimary: boolean("is_primary").notNull().default(false),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    status: masterPaymentMethodStatusEnum("status").notNull().default("active"),
    type: masterPaymentMethodTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    upiId: text("upi_id"),
  },
  (table) => [
    index("idx_master_payment_method_entity").on(table.entityType, table.entityId),
    index("idx_master_payment_method_type").on(table.type),
    index("idx_master_payment_method_is_primary").on(table.isPrimary),
    index("idx_master_payment_method_is_active").on(table.isActive),
  ],
);

export type MasterPaymentMethod = typeof masterPaymentMethod.$inferSelect;
export type NewMasterPaymentMethod = typeof masterPaymentMethod.$inferInsert;

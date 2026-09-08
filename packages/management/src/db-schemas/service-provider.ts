import { SP_STATUS } from "#/utils/constants";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const serviceProviderStatusEnum = pgEnum("service_provider_status", [
  SP_STATUS.ACTIVE,
  SP_STATUS.INACTIVE,
]);

export const serviceProvider = pgTable(
  "service_provider",
  {
    address: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    description: text(),
    email: text(),
    id: uuidv7().primaryKey(),
    logo: text(),
    name: text().notNull(),
    phone: text(),
    slug: text().notNull().unique(),
    status: serviceProviderStatusEnum().notNull().default("active"),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    website: text(),
  },
  (table) => [index("idx_service_provider_status").on(table.status)],
);

export type ServiceProvider = typeof serviceProvider.$inferSelect;
export type NewServiceProvider = typeof serviceProvider.$inferInsert;

import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const serviceProviderUser = pgTable(
  "service_provider_user",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    service_provider_id: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    user_id: text().notNull(),
  },
  (table) => [
    uniqueIndex("service_provider_user_unique").on(table.service_provider_id, table.user_id),
    uniqueIndex("service_provider_user_user_unique").on(table.user_id),
    index("idx_service_provider_user_sp").on(table.service_provider_id),
  ],
);

export type ServiceProviderUser = typeof serviceProviderUser.$inferSelect;
export type NewServiceProviderUser = typeof serviceProviderUser.$inferInsert;

import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const serviceProviderUser = pgTable(
  "service_provider_user",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuidv7("id").primaryKey(),
    serviceProviderId: text("service_provider_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    uniqueIndex("service_provider_user_unique").on(table.serviceProviderId, table.userId),
    uniqueIndex("service_provider_user_user_unique").on(table.userId),
    index("idx_service_provider_user_sp").on(table.serviceProviderId),
  ],
);

export type ServiceProviderUser = typeof serviceProviderUser.$inferSelect;
export type NewServiceProviderUser = typeof serviceProviderUser.$inferInsert;

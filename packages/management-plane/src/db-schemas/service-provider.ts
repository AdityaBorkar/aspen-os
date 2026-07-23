import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { SP_STATUS } from "../constants";

export const serviceProviderStatusEnum = pgEnum("service_provider_status", [
  SP_STATUS.ACTIVE,
  SP_STATUS.INACTIVE,
]);

export const serviceProvider = pgTable(
  "service_provider",
  {
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    email: text("email"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    logo: text("logo"),
    name: text("name").notNull(),
    phone: text("phone"),
    slug: text("slug").notNull().unique(),
    status: serviceProviderStatusEnum("status").notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    website: text("website"),
  },
  (table) => [index("idx_service_provider_status").on(table.status)],
);

export type ServiceProvider = typeof serviceProvider.$inferSelect;
export type NewServiceProvider = typeof serviceProvider.$inferInsert;

import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const address = pgTable(
  "address",
  {
    city: text("city"),
    country: text("country").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isPrimary: boolean("is_primary").notNull().default(false),
    label: text("label"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    metadata: jsonb("metadata"),
    postalCode: text("postal_code"),
    state: text("state"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_address_country").on(table.country),
    index("idx_address_is_primary").on(table.isPrimary),
  ],
);

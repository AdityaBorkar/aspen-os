import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const kvStore = pgTable("kv_store", {
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  key: text("key").primaryKey(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  value: text("value").notNull(),
});

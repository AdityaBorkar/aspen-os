import { sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const kvStore = pgTable("kv_store", {
  expires_at: timestamp({ withTimezone: true }),
  key: text().primaryKey(),
  tenant_id: text()
    .notNull()
    .default(sql`COALESCE(current_setting('app.tenant_id', true), 'default')`),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  value: text().notNull(),
});

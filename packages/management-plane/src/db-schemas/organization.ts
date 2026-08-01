// Mirror of better-auth's Organization plugin table.
// The platform doesn't define this table — it comes from better-auth's organization plugin.
// If better-auth's organization schema changes, this must be updated to match.
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const organization = pgTable("organization", {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  id: text("id").primaryKey(),
  logo: text("logo"),
  metadata: jsonb("metadata"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export type Organization = typeof organization.$inferSelect;

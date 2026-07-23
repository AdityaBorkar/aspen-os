import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const session = pgTable(
  "session",
  {
    activeOrganizationId: text("active_organization_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
  },
  (table) => [index("idx_session_active_org").on(table.activeOrganizationId)],
);

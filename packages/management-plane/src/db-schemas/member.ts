import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const member = pgTable(
  "member",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    role: text("role").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_member_organization").on(table.organizationId),
    index("idx_member_user").on(table.userId),
  ],
);

export type Member = typeof member.$inferSelect;

import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    name: text("name").notNull(),
    properties: jsonb("properties").default({}),
    sessionId: text("session_id"),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: text("user_id"),
  },
  (table) => ({
    nameIdx: index("idx_analytics_name").on(table.name),
    sessionIdIdx: index("idx_analytics_session_id").on(table.sessionId),
    userIdIdx: index("idx_analytics_user_id").on(table.userId),
  }),
);

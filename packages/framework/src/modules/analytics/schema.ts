import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const analyticsEvents = pgTable(
	"analytics_events",
	{
		id: text("id").primaryKey().default("gen_random_uuid()::text"),
		name: text("name").notNull(),
		properties: jsonb("properties").default({}),
		userId: text("user_id"),
		sessionId: text("session_id"),
		timestamp: timestamp("timestamp", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		nameIdx: index("idx_analytics_name").on(table.name),
		userIdIdx: index("idx_analytics_user_id").on(table.userId),
		sessionIdIdx: index("idx_analytics_session_id").on(table.sessionId),
	}),
);

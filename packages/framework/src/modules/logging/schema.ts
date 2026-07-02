import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const logs = pgTable(
	"logs",
	{
		id: text("id").primaryKey().default("gen_random_uuid()::text"),
		level: text("level").notNull(),
		message: text("message").notNull(),
		service: text("service").notNull(),
		timestamp: timestamp("timestamp", { withTimezone: true })
			.notNull()
			.defaultNow(),
		metadata: jsonb("metadata").default({}),
		traceId: text("trace_id"),
		spanId: text("span_id"),
		userId: text("user_id"),
		requestId: text("request_id"),
		durationMs: integer("duration_ms"),
		errorName: text("error_name"),
		errorMessage: text("error_message"),
		errorStack: text("error_stack"),
	},
	(table) => ({
		levelIdx: index("idx_logs_level").on(table.level),
		serviceIdx: index("idx_logs_service").on(table.service),
		traceIdIdx: index("idx_logs_trace_id").on(table.traceId),
		userIdIdx: index("idx_logs_user_id").on(table.userId),
	}),
);

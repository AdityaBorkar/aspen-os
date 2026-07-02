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
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    errorName: text("error_name"),
    errorStack: text("error_stack"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    level: text("level").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata").default({}),
    requestId: text("request_id"),
    service: text("service").notNull(),
    spanId: text("span_id"),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    traceId: text("trace_id"),
    userId: text("user_id"),
  },
  (table) => ({
    levelIdx: index("idx_logs_level").on(table.level),
    serviceIdx: index("idx_logs_service").on(table.service),
    traceIdIdx: index("idx_logs_trace_id").on(table.traceId),
    userIdIdx: index("idx_logs_user_id").on(table.userId),
  }),
);

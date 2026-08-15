import type { LogLevel } from "#/server/log/types";
import type { JsonValue } from "#/server/types";
import { uuidv7 } from "#/server/utils/uuidv7";

import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const logs = pgTable(
  "logs",
  {
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    errorName: text("error_name"),
    errorStack: text("error_stack"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    level: text("level").$type<LogLevel>().notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<Record<string, JsonValue> | null>().default({}),
    requestId: text("request_id"),
    service: text("service").notNull(),
    spanId: text("span_id"),
    tenantId: text("tenant_id")
      .notNull()
      .default(sql`COALESCE(current_setting('app.tenant_id', true), 'default')`),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    traceId: text("trace_id"),
    userId: text("user_id"),
  },
  (table) => ({
    levelIdx: index("idx_logs_level").on(table.level),
    serviceIdx: index("idx_logs_service").on(table.service),
    tenantIdIdx: index("idx_logs_tenant_id").on(table.tenantId),
    traceIdIdx: index("idx_logs_trace_id").on(table.traceId),
    userIdIdx: index("idx_logs_user_id").on(table.userId),
  }),
);

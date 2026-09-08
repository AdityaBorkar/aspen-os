import { uuidv7 } from "#/server/db/schema/data-types";
import type { LogLevel } from "#/server/log/types";
import type { JsonValue } from "#/server/types";

import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const logs = pgTable(
  "logs",
  {
    duration_ms: integer(),
    error_message: text(),
    error_name: text(),
    error_stack: text(),
    id: uuidv7().primaryKey(),
    level: text().$type<LogLevel>().notNull(),
    message: text().notNull(),
    metadata: jsonb().$type<Record<string, JsonValue> | null>().default({}),
    request_id: text(),
    service: text().notNull(),
    span_id: text(),
    tenant_id: text()
      .notNull()
      .default(sql`COALESCE(current_setting('app.tenant_id', true), 'default')`),
    timestamp: timestamp({ withTimezone: true }).notNull().defaultNow(),
    trace_id: text(),
    user_id: text(),
  },
  (table) => ({
    levelIdx: index("idx_logs_level").on(table.level),
    serviceIdx: index("idx_logs_service").on(table.service),
    tenantIdIdx: index("idx_logs_tenant_id").on(table.tenant_id),
    traceIdIdx: index("idx_logs_trace_id").on(table.trace_id),
    userIdIdx: index("idx_logs_user_id").on(table.user_id),
  }),
);

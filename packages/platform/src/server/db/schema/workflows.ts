import { uuidv7 } from "#/server/db/schema/data-types";

import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    completed_at: timestamp({ withTimezone: true }),
    duration_ms: integer(),
    error: jsonb(),
    id: uuidv7().primaryKey(),
    input: jsonb(),
    metadata: jsonb().default({}),
    output: jsonb(),
    started_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    status: text().notNull().default("running"),
    tenant_id: text().default(sql`COALESCE(current_setting('app.tenant_id', true), 'default')`),
    workflow_name: text().notNull(),
  },
  (table) => [
    index("idx_workflow_runs_name").on(table.workflow_name),
    index("idx_workflow_runs_status").on(table.status),
    index("idx_workflow_runs_tenant").on(table.tenant_id),
  ],
);

export const workflowSteps = pgTable(
  "workflow_steps",
  {
    attempt: integer().notNull().default(1),
    completed_at: timestamp({ withTimezone: true }),
    duration_ms: integer(),
    error: jsonb(),
    id: uuidv7().primaryKey(),
    metadata: jsonb().default({}),
    output: jsonb(),
    run_id: text().notNull(),
    started_at: timestamp({ withTimezone: true }),
    status: text().notNull().default("pending"),
    step_name: text().notNull(),
  },
  (table) => [
    index("idx_workflow_steps_run").on(table.run_id),
    index("idx_workflow_steps_status").on(table.run_id, table.step_name),
  ],
);

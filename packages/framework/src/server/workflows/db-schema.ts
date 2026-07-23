import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    error: jsonb("error"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    input: jsonb("input"),
    metadata: jsonb("metadata").default({}),
    output: jsonb("output"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status").notNull().default("running"),
    tenantId: text("tenant_id").default(
      sql`COALESCE(current_setting('app.tenant_id', true), 'default')`,
    ),
    workflowName: text("workflow_name").notNull(),
  },
  (table) => [
    index("idx_workflow_runs_name").on(table.workflowName),
    index("idx_workflow_runs_status").on(table.status),
    index("idx_workflow_runs_tenant").on(table.tenantId),
  ],
);

export const workflowSteps = pgTable(
  "workflow_steps",
  {
    attempt: integer("attempt").notNull().default(1),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    error: jsonb("error"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    metadata: jsonb("metadata").default({}),
    output: jsonb("output"),
    runId: text("run_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    status: text("status").notNull().default("pending"),
    stepName: text("step_name").notNull(),
  },
  (table) => [
    index("idx_workflow_steps_run").on(table.runId),
    index("idx_workflow_steps_status").on(table.runId, table.stepName),
  ],
);

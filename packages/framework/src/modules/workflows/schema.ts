import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const workflowExecutions = pgTable(
  "workflow_executions",
  {
    completedAt: timestamp("completed_at", { withTimezone: true }),
    currentStep: integer("current_step").notNull().default(0),
    error: text("error"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    input: jsonb("input"),
    metadata: jsonb("metadata").default({}),
    output: jsonb("output"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status").notNull().default("pending"),
    workflowName: text("workflow_name").notNull(),
  },
  (table) => ({
    nameIdx: index("idx_workflow_executions_name").on(table.workflowName),
    statusIdx: index("idx_workflow_executions_status").on(table.status),
  }),
);

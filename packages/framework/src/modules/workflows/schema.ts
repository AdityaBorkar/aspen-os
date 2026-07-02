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
		id: text("id").primaryKey().default("gen_random_uuid()::text"),
		workflowName: text("workflow_name").notNull(),
		status: text("status").notNull().default("pending"),
		input: jsonb("input"),
		output: jsonb("output"),
		error: text("error"),
		currentStep: integer("current_step").notNull().default(0),
		metadata: jsonb("metadata").default({}),
		startedAt: timestamp("started_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
	},
	(table) => ({
		nameIdx: index("idx_workflow_executions_name").on(table.workflowName),
		statusIdx: index("idx_workflow_executions_status").on(table.status),
	}),
);

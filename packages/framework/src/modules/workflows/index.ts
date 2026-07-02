import PgBoss from "pg-boss";
import { getDrizzle, getPool } from "../../lib/db";
import * as schema from "./schema";
import { createExecutionService } from "./service";
import type {
	Workflow,
	WorkflowConfig,
	WorkflowContext,
	WorkflowExecution,
	WorkflowsModule,
} from "./types";

export type {
	Workflow,
	WorkflowConfig,
	WorkflowContext,
	WorkflowExecution,
	WorkflowStatus,
	WorkflowStep,
	WorkflowsModule,
} from "./types";

export function createWorkflowsModule(config: WorkflowConfig): WorkflowsModule {
	let boss: PgBoss | null = null;
	const pool = getPool(config.database);
	const db = getDrizzle(config.database, schema);
	const executionService = createExecutionService(db);
	const workflows = new Map<string, Workflow>();

	async function initialize(): Promise<void> {
		boss = new PgBoss({
			host: config.database.host,
			port: config.database.port,
			user: config.database.user,
			password: config.database.password,
			database: config.database.database,
		});
		await boss.start();

		await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        workflow_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        input JSONB,
        output JSONB,
        error TEXT,
        current_step INTEGER NOT NULL DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_workflow_executions_name ON workflow_executions(workflow_name);
      CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
    `);
	}

	async function destroy(): Promise<void> {
		if (boss) {
			await boss.stop();
			boss = null;
		}
	}

	function register<TInput = unknown, TOutput = unknown>(
		workflow: Workflow<TInput, TOutput>,
	): void {
		workflows.set(workflow.name, workflow as Workflow);
	}

	async function execute<TInput = unknown, TOutput = unknown>(
		workflowName: string,
		input: TInput,
		metadata?: Record<string, unknown>,
	): Promise<WorkflowExecution> {
		if (!boss) throw new Error("Workflows not initialized");

		const workflow = workflows.get(workflowName);
		if (!workflow) throw new Error(`Workflow "${workflowName}" not found`);

		const execution = await executionService.create(
			workflowName,
			input,
			metadata ?? {},
		);

		try {
			let currentData: unknown = input;
			for (let i = 0; i < workflow.steps.length; i++) {
				const step = workflow.steps[i]!;
				await executionService.updateStep(execution.id, i);

				const context: WorkflowContext = {
					workflowId: execution.id,
					stepIndex: i,
					metadata: metadata ?? {},
				};
				currentData = await step.handler(currentData, context);
			}

			await executionService.complete(execution.id, currentData);
			return {
				...execution,
				status: "completed",
				output: currentData,
				currentStep: workflow.steps.length,
				completedAt: new Date(),
			};
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);

			for (let i = workflow.steps.length - 1; i >= 0; i--) {
				const step = workflow.steps[i]!;
				if (step.compensate) {
					try {
						await step.compensate(input, undefined, {
							workflowId: execution.id,
							stepIndex: i,
							metadata: metadata ?? {},
						});
					} catch {
						/* Compensation failure logged but doesn't override original error */
					}
				}
			}

			await executionService.fail(execution.id, error);
			return { ...execution, status: "failed", error, completedAt: new Date() };
		}
	}

	return {
		initialize,
		destroy,
		register,
		execute,
		getExecution: executionService.getById,
		listExecutions: executionService.list,
	};
}

import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as s from "./schema";
import type { WorkflowExecution, WorkflowStatus } from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export function createExecutionService(db: DrizzleDB) {
	async function create(
		workflowName: string,
		input: unknown,
		metadata: Record<string, unknown>,
	): Promise<WorkflowExecution> {
		const [row] = await db
			.insert(s.workflowExecutions)
			.values({
				workflowName,
				status: "running",
				input: input as Record<string, unknown>,
				metadata,
			})
			.returning();

		return {
			id: row!.id,
			workflowName: row!.workflowName,
			status: "running",
			input: row!.input,
			currentStep: 0,
			startedAt: row!.startedAt,
		};
	}

	async function updateStep(executionId: string, step: number): Promise<void> {
		await db
			.update(s.workflowExecutions)
			.set({ currentStep: step })
			.where(eq(s.workflowExecutions.id, executionId));
	}

	async function complete(executionId: string, output: unknown): Promise<void> {
		await db
			.update(s.workflowExecutions)
			.set({
				status: "completed",
				output: output as Record<string, unknown>,
				completedAt: new Date(),
			})
			.where(eq(s.workflowExecutions.id, executionId));
	}

	async function fail(executionId: string, error: string): Promise<void> {
		await db
			.update(s.workflowExecutions)
			.set({ status: "failed", error, completedAt: new Date() })
			.where(eq(s.workflowExecutions.id, executionId));
	}

	async function getById(
		executionId: string,
	): Promise<WorkflowExecution | null> {
		const [row] = await db
			.select()
			.from(s.workflowExecutions)
			.where(eq(s.workflowExecutions.id, executionId))
			.limit(1);
		if (!row) return null;
		return toExecution(row);
	}

	async function list(
		workflowName?: string,
		limit = 50,
	): Promise<WorkflowExecution[]> {
		const where = workflowName
			? eq(s.workflowExecutions.workflowName, workflowName)
			: undefined;
		const rows = await db
			.select()
			.from(s.workflowExecutions)
			.where(where)
			.orderBy(desc(s.workflowExecutions.startedAt))
			.limit(limit);
		return rows.map(toExecution);
	}

	function toExecution(row: {
		id: string;
		workflowName: string;
		status: string;
		input: unknown;
		output: unknown;
		error: string | null;
		currentStep: number;
		startedAt: Date;
		completedAt: Date | null;
	}): WorkflowExecution {
		return {
			id: row.id,
			workflowName: row.workflowName,
			status: row.status as WorkflowStatus,
			input: row.input,
			output: row.output,
			error: row.error ?? undefined,
			currentStep: row.currentStep,
			startedAt: row.startedAt,
			completedAt: row.completedAt ?? undefined,
		};
	}

	return { create, updateStep, complete, fail, getById, list };
}

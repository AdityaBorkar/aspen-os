import type { DatabaseConfig } from "../../lib/types";

export type WorkflowStatus =
	| "pending"
	| "running"
	| "completed"
	| "failed"
	| "compensating"
	| "compensated";

export interface WorkflowConfig {
	database: DatabaseConfig;
	schema?: string;
}

export interface WorkflowStep<TInput = unknown, TOutput = unknown> {
	name: string;
	handler: (
		input: TInput,
		context: WorkflowContext,
	) => TOutput | Promise<TOutput>;
	compensate?: (
		input: TInput,
		output: TOutput,
		context: WorkflowContext,
	) => void | Promise<void>;
}

export interface WorkflowContext {
	workflowId: string;
	stepIndex: number;
	metadata: Record<string, unknown>;
}

export interface Workflow<TInput = unknown, TOutput = unknown> {
	name: string;
	steps: WorkflowStep<TInput, TOutput>[];
}

export interface WorkflowExecution {
	id: string;
	workflowName: string;
	status: WorkflowStatus;
	input: unknown;
	output?: unknown;
	error?: string;
	currentStep: number;
	startedAt: Date;
	completedAt?: Date;
}

export interface WorkflowsModule {
	initialize(): Promise<void>;
	destroy(): Promise<void>;

	register<TInput = unknown, TOutput = unknown>(
		workflow: Workflow<TInput, TOutput>,
	): void;
	execute<TInput = unknown, TOutput = unknown>(
		workflowName: string,
		input: TInput,
		metadata?: Record<string, unknown>,
	): Promise<WorkflowExecution>;
	getExecution(executionId: string): Promise<WorkflowExecution | null>;
	listExecutions(
		workflowName?: string,
		limit?: number,
	): Promise<WorkflowExecution[]>;
}

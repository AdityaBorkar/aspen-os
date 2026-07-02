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
  compensate?: (
    input: TInput,
    output: TOutput,
    context: WorkflowContext,
  ) => void | Promise<void>;
  handler: (
    input: TInput,
    context: WorkflowContext,
  ) => TOutput | Promise<TOutput>;
  name: string;
}

export interface WorkflowContext {
  metadata: Record<string, unknown>;
  stepIndex: number;
  workflowId: string;
}

export interface Workflow<TInput = unknown, TOutput = unknown> {
  name: string;
  steps: WorkflowStep<TInput, TOutput>[];
}

export interface WorkflowExecution {
  completedAt?: Date;
  currentStep: number;
  error?: string;
  id: string;
  input: unknown;
  output?: unknown;
  startedAt: Date;
  status: WorkflowStatus;
  workflowName: string;
}

export interface WorkflowsModule {
  destroy(): Promise<void>;
  execute<TInput = unknown, TOutput = unknown>(
    workflowName: string,
    input: TInput,
    metadata?: Record<string, unknown>,
  ): Promise<WorkflowExecution>;
  getExecution(executionId: string): Promise<WorkflowExecution | null>;
  initialize(): Promise<void>;
  listExecutions(
    workflowName?: string,
    limit?: number,
  ): Promise<WorkflowExecution[]>;

  register<TInput = unknown, TOutput = unknown>(
    workflow: Workflow<TInput, TOutput>,
  ): void;
}

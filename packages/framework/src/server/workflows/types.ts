import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { AuthUnit } from "../auth";
import type { PubSubUnit } from "../pubsub";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export interface StandardSchema {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => unknown;
    readonly types?: {
      readonly input: unknown;
      readonly output: unknown;
    };
  };
}

export type InferSchemaOutput<T> = T extends {
  readonly "~standard": { readonly types?: { readonly output: infer O } };
}
  ? O
  : unknown;

export interface StepOptions {
  retries?: number;
}

export interface WorkflowStepInstance<TInput, TOutput> {
  readonly handler: (input: TInput, ctx: WorkflowContext) => Promise<TOutput>;
  readonly name: string;
  readonly schema?: StandardSchema;
}

export interface StepRunner {
  run<T>(
    name: string,
    fn: () => T | Promise<T>,
    options?: StepOptions,
  ): Promise<T>;
  run<TInput, TOutput>(
    step: WorkflowStepInstance<TInput, TOutput>,
    input: TInput,
    options?: StepOptions,
  ): Promise<TOutput>;
  sleep(ms: number): Promise<void>;
}

export interface WorkflowContext {
  auth?: AuthUnit;
  config: Record<string, unknown>;
  db: DrizzleDB;
  pubsub: PubSubUnit;
  step: StepRunner;
}

export interface WorkflowConfig<TInput, TOutput> {
  handler: (input: TInput, ctx: WorkflowContext) => Promise<TOutput>;
  name: string;
  schema?: StandardSchema;
}

export interface RunOptions {
  auth?: AuthUnit;
  config?: Record<string, unknown>;
  db?: DrizzleDB;
  pubsub?: PubSubUnit;
}

export interface WorkflowInstance<TInput, TOutput> {
  readonly name: string;
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
}

export type WorkflowRunStatus = "running" | "completed" | "failed";
export type WorkflowStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

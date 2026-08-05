import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { AuditUnit } from "../audit";
import type { AuthUnit } from "../auth";
import type { PubSubUnit } from "../pubsub";

type DrizzleDB<
  TSchemas extends Record<string, unknown> = Record<string, never>,
> = NodePgDatabase<TSchemas>;

/** A Standard Schema v1 compatible schema. */
export type StandardSchema<Input = unknown, Output = Input> = StandardSchemaV1<
  Input,
  Output
>;

/** Infers the validated output type of a Standard Schema. */
export type InferSchemaOutput<TSchema extends StandardSchema> =
  StandardSchemaV1.InferOutput<TSchema>;

export interface StepOptions {
  retries?: number;
}

export interface WorkflowStepInstance<
  TInput,
  TOutput,
  TSchemas extends Record<string, unknown> = Record<string, never>,
> {
  readonly handler: (
    input: TInput,
    ctx: WorkflowContext<TSchemas>,
  ) => Promise<TOutput>;
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

export interface WorkflowContext<
  TSchemas extends Record<string, unknown> = Record<string, never>,
> {
  actorId?: string;
  audit: AuditUnit;
  auth?: AuthUnit;
  config: Record<string, unknown>;
  db: DrizzleDB<TSchemas>;
  pubsub: PubSubUnit;
  runId: string;
  step: StepRunner;
}

export interface WorkflowConfig<
  TInput,
  TOutput,
  TSchemas extends Record<string, unknown> = Record<string, never>,
> {
  handler: (input: TInput, ctx: WorkflowContext<TSchemas>) => Promise<TOutput>;
  name: string;
  schema?: StandardSchema;
}

export interface RunOptions {
  actorId?: string;
  audit?: AuditUnit;
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

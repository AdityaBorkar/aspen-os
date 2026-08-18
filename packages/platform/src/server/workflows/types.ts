import type { AuditUnit } from "#/server/audit";
import type { AuthUnit } from "#/server/auth";
import type { PubSubUnit } from "#/server/pubsub";
import type { JsonValue, SchemaMap } from "#/server/types";

import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DrizzleDB<TSchemas extends SchemaMap = Record<string, never>> = PostgresJsDatabase<TSchemas>;

/** A Standard Schema v1 compatible schema. */
export type StandardSchema<Input = unknown, Output = Input> = StandardSchemaV1<Input, Output>;

/** Infers the validated output type of a Standard Schema. */
export type InferSchemaOutput<TSchema extends StandardSchema> =
  StandardSchemaV1.InferOutput<TSchema>;

export interface StepOptions {
  retries?: number;
}

export interface WorkflowStepInstance<
  TInput,
  TOutput,
  TSchemas extends SchemaMap = Record<string, never>,
> {
  readonly handler: (input: TInput, ctx: WorkflowContext<TSchemas>) => Promise<TOutput>;
  readonly name: string;
  readonly schema?: StandardSchema;
}

export interface StepRunner {
  run: {
    <TValue>(
      name: string,
      fn: () => TValue | Promise<TValue>,
      options?: StepOptions,
    ): Promise<TValue>;
    <TInput, TOutput>(
      step: WorkflowStepInstance<TInput, TOutput>,
      input: TInput,
      options?: StepOptions,
    ): Promise<TOutput>;
  };
  sleep: (ms: number) => Promise<void>;
}

export interface WorkflowContext<TSchemas extends SchemaMap = Record<string, never>> {
  actorId?: string;
  audit: AuditUnit;
  auth?: AuthUnit;
  config: Record<string, JsonValue>;
  db: DrizzleDB<TSchemas>;
  pubsub: PubSubUnit;
  runId: string;
  step: StepRunner;
}

export interface WorkflowConfig<
  TInput,
  TOutput,
  TSchemas extends SchemaMap = Record<string, never>,
> {
  handler: (input: TInput, ctx: WorkflowContext<TSchemas>) => Promise<TOutput>;
  name: string;
  schema?: StandardSchema<unknown, TInput>;
}

export interface RunOptions {
  actorId?: string;
  audit?: AuditUnit;
  auth?: AuthUnit;
  config?: Record<string, JsonValue>;
  db?: DrizzleDB<SchemaMap>;
  pubsub?: PubSubUnit;
}

export interface WorkflowInstance<TInput, TOutput> {
  readonly name: string;
  run: (input: TInput, options?: RunOptions) => Promise<TOutput>;
}

export type WorkflowRunStatus = "running" | "completed" | "failed";
export type WorkflowStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

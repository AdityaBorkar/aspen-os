import { workflowRuns, workflowSteps } from "#/server/db/schema";
import type { ChildLogger } from "#/server/log";
import type { SchemaMap } from "#/server/types";
import { context, getContext } from "#/server/utils";
import type { Context } from "#/server/utils";
import { setTimeout as sleep } from "node:timers/promises";

import { SchemaError } from "@standard-schema/utils";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type {
  InferSchemaOutput,
  RunOptions,
  StandardSchema,
  StepOptions,
  StepRunner,
  WorkflowConfig,
  WorkflowContext,
  WorkflowInstance,
  WorkflowStepInstance,
} from "./types";

type DrizzleDB<TSchemas extends SchemaMap = Record<string, never>> = PostgresJsDatabase<TSchemas>;

function durationMs(startedAt: Date, completedAt: Date): number {
  return completedAt.getTime() - startedAt.getTime();
}

function normalizeError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

function isWorkflowStep<TSchemas extends SchemaMap>(
  value: string | WorkflowStepInstance<any, any, TSchemas>,
): value is WorkflowStepInstance<any, any, TSchemas> {
  return value instanceof Object && "handler" in value;
}

/** The JSON-serializable error envelope stored on workflow step/run rows. */
export interface SerializedError {
  attempts?: number;
  cause?: SerializedError;
  message: string;
  name: string;
  stack?: string;
}

function serializeError(error: Error, depth = 0): SerializedError {
  const base: SerializedError = { message: error.message, name: error.name };
  if (error.stack) {
    base.stack = error.stack;
  }
  if (depth < 5) {
    const { cause } = error;
    // Only non-Error causes (e.g. thrown primitives) are omitted from the chain.
    if (cause instanceof Error) {
      base.cause = serializeError(cause, depth + 1);
    }
  }
  return base;
}

async function validateInput<TInput, TOutput>(
  schema: StandardSchema<TInput, TOutput>,
  input: TInput,
): Promise<TOutput> {
  const result = await schema["~standard"].validate(input);

  if (result.issues) {
    throw new SchemaError(result.issues);
  }

  return result.value;
}

function resolveRunStore(options?: RunOptions): Context {
  console.log({ ctx3: Object.keys(context.getStore() || {}) });
  const ctx = getContext();
  if (!options) {
    return ctx;
  }
  const audit = options.audit ?? ctx?.audit;
  const auth = options.auth ?? ctx?.auth;
  // SAFETY: RunOptions.db uses the broad SchemaMap generic while Context.db uses the default schema; both are postgres-js drizzle instances sharing the same runtime surface.
  const db = (options.db ?? ctx?.db) as Context["db"] | undefined;
  const log = options.log ?? ctx?.log;
  const pubsub = options.pubsub ?? ctx?.pubsub;
  if (!audit || !auth || !db || !log || !pubsub) {
    throw new Error(
      "Workflow.run() requires audit, auth, db, log, and pubsub; provide them in RunOptions or call inside Platform.run().",
    );
  }
  return {
    actorId: options.actorId ?? ctx?.actorId,
    audit,
    auth,
    db,
    log,
    pubsub,
    requestId: ctx?.requestId,
    tenantId: ctx?.tenantId,
    traceId: ctx?.traceId,
  };
}

/**
 * A workflow definition.
 *
 * Instances are created through the `Workflow.name(...)` fluent builder (forwards-compatible
 * with the pre-class API) or directly via `new Workflow({ name, handler, schema })`.
 */
export class Workflow<TInput, TOutput> implements WorkflowInstance<TInput, TOutput> {
  readonly name: string;

  private readonly handler: (input: TInput, ctx: WorkflowContext) => Promise<TOutput>;
  private readonly schema?: StandardSchema<unknown, TInput>;

  constructor(config: WorkflowConfig<TInput, TOutput>) {
    this.name = config.name;
    this.handler = config.handler;
    this.schema = config.schema;
  }

  /** Executes this workflow against the ambient context (or the supplied one). */
  run(input: TInput, options?: RunOptions): Promise<TOutput> {
    console.log("RUN:", { input, options });
    console.log({ ctx1: Object.keys(context.getStore() || {}) });
    return new WorkflowEngine().run(
      { handler: this.handler, name: this.name, schema: this.schema },
      input,
      options,
    );
  }

  static name(workflowName: string) {
    return {
      handler<TIn, TOut>(
        fn: (input: TIn, ctx: WorkflowContext) => Promise<TOut>,
      ): Workflow<TIn, TOut> {
        return new Workflow<TIn, TOut>({ handler: fn, name: workflowName });
      },
      input<TSchema extends StandardSchema>(schema: TSchema) {
        type TIn = InferSchemaOutput<TSchema>;
        return {
          handler<TOut>(
            fn: (input: TIn, ctx: WorkflowContext) => Promise<TOut>,
          ): Workflow<TIn, TOut> {
            return new Workflow<TIn, TOut>({
              handler: fn,
              name: workflowName,
              schema,
            });
          },
        };
      },
    };
  }
}

/**
 * A reusable workflow step definition.
 *
 * Instances are created through the `WorkflowStep.name(...)` fluent builder (forwards-compatible
 * with the pre-class API) or directly via `new WorkflowStep(name, handler, schema?)`.
 * Steps are executed by the workflow engine through `ctx.step.run(step, input)`.
 */
export class WorkflowStep<TInput, TOutput> implements WorkflowStepInstance<TInput, TOutput> {
  readonly name: string;
  readonly handler: (input: TInput, ctx: WorkflowContext) => Promise<TOutput>;
  readonly schema?: StandardSchema;

  constructor(
    name: string,
    handler: (input: TInput, ctx: WorkflowContext) => Promise<TOutput>,
    schema?: StandardSchema,
  ) {
    this.name = name;
    this.handler = handler;
    this.schema = schema;
  }

  static name(stepName: string) {
    return {
      handler<TIn, TOut>(
        fn: (input: TIn, ctx: WorkflowContext) => Promise<TOut>,
      ): WorkflowStep<TIn, TOut> {
        return new WorkflowStep<TIn, TOut>(stepName, fn);
      },
      input<TSchema extends StandardSchema>(schema: TSchema) {
        type TIn = InferSchemaOutput<TSchema>;
        return {
          handler<TOut>(
            fn: (input: TIn, ctx: WorkflowContext) => Promise<TOut>,
          ): WorkflowStep<TIn, TOut> {
            return new WorkflowStep<TIn, TOut>(stepName, fn, schema);
          },
        };
      },
    };
  }
}

/**
 * Orchestrates workflow runs and steps against a single database.
 *
 * `WorkflowEngine` queues run/step rows, applies retries, and persists outcomes. Create one per
 * database; concurrent runs are safe because per-run state lives in the run context, not here.
 */
export class WorkflowEngine {
  private readonly db: DrizzleDB;

  constructor() {
    console.log({ ctx2: Object.keys(context.getStore() || {}) });
    const store = resolveRunStore();
    console.log({ store });
    this.db = store.db;
  }

  /** Runs a step (with input validation and retries) and persists its outcome. */
  public async executeStep<TResult>(input: {
    runId: string;
    name: string;
    fn: () => TResult | Promise<TResult>;
    options?: StepOptions;
    log?: ChildLogger;
  }): Promise<TResult> {
    const { runId, name, fn, options, log } = input;
    const maxAttempts = (options?.retries ?? 0) + 1;

    const [existing] = await this.db
      .select({ output: workflowSteps.output })
      .from(workflowSteps)
      .where(
        and(
          eq(workflowSteps.run_id, runId),
          eq(workflowSteps.step_name, name),
          eq(workflowSteps.status, "completed"),
        ),
      )
      .limit(1);

    if (existing) {
      // SAFETY: a completed step row's output was produced by this step's own handler in a prior run.
      return existing.output as TResult;
    }

    const stepId = crypto.randomUUID();
    const startedAt = new Date();

    await this.db.insert(workflowSteps).values({
      id: stepId,
      run_id: runId,
      started_at: startedAt,
      status: "running",
      step_name: name,
    });

    // oxlint-disable eslint/no-await-in-loop
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();
        await this.markStepCompleted(stepId, { attempt, result, startedAt });
        return result;
      } catch (error) {
        const normalized = normalizeError(error);

        if (attempt < maxAttempts) {
          await this.markStepRetrying(stepId, { attempt, error: normalized });
        } else {
          await this.markStepFailed(stepId, {
            attempts: maxAttempts,
            error: normalized,
            startedAt,
          });
          log?.error(`Workflow step "${name}" failed after ${maxAttempts} attempt(s)`, normalized, {
            attempts: maxAttempts,
            runId,
            stepName: name,
          });
          throw normalized;
        }
      }
    }
    // oxlint-enable eslint/no-await-in-loop

    throw new Error(`Workflow step "${name}" exhausted all ${maxAttempts} attempt(s)`);
  }

  private async markStepCompleted(
    stepId: string,
    outcome: {
      attempt: number;
      result: typeof workflowSteps.$inferInsert.output;
      startedAt: Date;
    },
  ): Promise<void> {
    const { attempt, result, startedAt } = outcome;
    const completedAt = new Date();
    await this.db
      .update(workflowSteps)
      .set({
        attempt,
        completed_at: completedAt,
        duration_ms: durationMs(startedAt, completedAt),
        output: result ?? null,
        status: "completed",
      })
      .where(eq(workflowSteps.id, stepId));
  }

  private async markStepRetrying(
    stepId: string,
    outcome: { attempt: number; error: Error },
  ): Promise<void> {
    await this.db
      .update(workflowSteps)
      .set({ attempt: outcome.attempt, error: serializeError(outcome.error), status: "running" })
      .where(eq(workflowSteps.id, stepId));
  }

  private async markStepFailed(
    stepId: string,
    outcome: { attempts: number; error: Error; startedAt: Date },
  ): Promise<void> {
    const { attempts: maxAttempts, error, startedAt } = outcome;
    const completedAt = new Date();
    const serialized = serializeError(error);
    serialized.attempts = maxAttempts;
    await this.db
      .update(workflowSteps)
      .set({
        attempt: maxAttempts,
        completed_at: completedAt,
        duration_ms: durationMs(startedAt, completedAt),
        error: serialized,
        status: "failed",
      })
      .where(eq(workflowSteps.id, stepId));
  }

  /** Executes a workflow from start to (completed or failed) persistence. */
  public async run<TInput, TOutput, TSchemas extends SchemaMap = Record<string, never>>(
    config: WorkflowConfig<TInput, TOutput, TSchemas>,
    input: TInput,
    options?: RunOptions,
  ): Promise<TOutput> {
    console.log({ ctx4: Object.keys(context.getStore() || {}) });
    console.log("RUNNING WORKFLOW", { config, input, options });
    const store = resolveRunStore(options);
    const { actorId, audit, db, pubsub, auth } = store;

    if (config.schema) {
      input = await validateInput(config.schema, input);
    }
    const runId = crypto.randomUUID();
    const startedAt = new Date();
    const log = store.log.child({ runId, workflowName: config.name });
    log.info(`Workflow "${config.name}" started`, { runId });

    await db.insert(workflowRuns).values({
      id: runId,
      input: input ?? null,
      started_at: startedAt,
      status: "running",
      workflow_name: config.name,
    });

    const ctx: WorkflowContext<TSchemas> = {
      actorId,
      audit,
      auth,
      config: options?.config ?? {},
      // SAFETY: the resolved db is a valid postgres-js drizzle instance for the merged schemas.
      db: store.db as DrizzleDB<TSchemas>,
      log,
      pubsub,
      runId,
      // SAFETY: the step runner resolves the same context and db for every step invocation.
      step: new WorkflowRunner<TSchemas>(this, () => ctx, runId),
    };

    try {
      const output = await config.handler(input, ctx);
      const completedAt = new Date();

      log.info(`Workflow "${config.name}" completed`, {
        durationMs: durationMs(startedAt, completedAt),
        runId,
      });

      await db
        .update(workflowRuns)
        .set({
          completed_at: completedAt,
          duration_ms: durationMs(startedAt, completedAt),
          output: output ?? null,
          status: "completed",
        })
        .where(eq(workflowRuns.id, runId));

      return output;
    } catch (error) {
      const completedAt = new Date();
      const normalized = normalizeError(error);

      log.error(`Workflow "${config.name}" failed`, normalized, {
        durationMs: durationMs(startedAt, completedAt),
        runId,
      });

      await db
        .update(workflowRuns)
        .set({
          completed_at: completedAt,
          duration_ms: durationMs(startedAt, completedAt),
          error: serializeError(normalized),
          status: "failed",
        })
        .where(eq(workflowRuns.id, runId));

      throw normalized;
    }
  }
}

/** Per-run step runner: dispatches named or structured steps onto the engine, plus `sleep`. */
class WorkflowRunner<TSchemas extends SchemaMap> implements StepRunner<TSchemas> {
  private readonly engine: WorkflowEngine;
  private readonly getCtx: () => WorkflowContext<TSchemas>;
  private readonly runId: string;

  constructor(engine: WorkflowEngine, getCtx: () => WorkflowContext<TSchemas>, runId: string) {
    this.engine = engine;
    this.getCtx = getCtx;
    this.runId = runId;
  }

  async run<TValue>(
    name: string,
    fn: () => TValue | Promise<TValue>,
    options?: StepOptions,
  ): Promise<TValue>;
  async run<TInput, TOutput>(
    step: WorkflowStepInstance<TInput, TOutput, TSchemas>,
    input: TInput,
    options?: StepOptions,
  ): Promise<TOutput>;
  async run<TValue>(
    nameOrStep: string | WorkflowStepInstance<any, any, TSchemas>,
    fnOrInput: (() => TValue | Promise<TValue>) | TValue,
    options?: StepOptions,
  ): Promise<TValue> {
    if (isWorkflowStep(nameOrStep)) {
      const step = nameOrStep;
      const input = fnOrInput;
      return this.engine.executeStep({
        fn: async () => {
          const validated = step.schema ? await validateInput(step.schema, input) : input;
          return step.handler(validated, this.getCtx());
        },
        log: this.getCtx().log,
        name: step.name,
        options,
        runId: this.runId,
      });
    }
    if (!(fnOrInput instanceof Function)) {
      throw new Error(`Step "${nameOrStep}" requires a function handler`);
    }
    return this.engine.executeStep({
      fn: fnOrInput,
      log: this.getCtx().log,
      name: nameOrStep,
      options,
      runId: this.runId,
    });
  }

  async sleep(ms: number): Promise<void> {
    await sleep(ms);
  }
}

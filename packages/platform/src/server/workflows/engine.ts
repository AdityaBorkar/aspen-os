import { workflowRuns, workflowSteps } from "#/server/db/schema";
import type { ChildLogger } from "#/server/log";
import type { SchemaMap } from "#/server/types";
import { getContext } from "#/server/utils";
import type { Context } from "#/server/utils";
import { setTimeout as sleep } from "node:timers/promises";

import { SchemaError } from "@standard-schema/utils";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type {
  InferSchemaOutput,
  StandardSchema,
  StepOptions,
  StepRunner,
  WorkflowConfig,
  WorkflowContext,
  WorkflowInstance,
  WorkflowStepInstance,
} from "./types";

type DrizzleDB<TSchemas extends SchemaMap = Record<string, never>> = PostgresJsDatabase<TSchemas>;

function generateId(): string {
  return crypto.randomUUID();
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
  run(input: TInput, context?: Context): Promise<TOutput> {
    return executeWorkflow(
      { handler: this.handler, name: this.name, schema: this.schema },
      input,
      context,
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

  constructor(db: DrizzleDB) {
    this.db = db;
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
          eq(workflowSteps.runId, runId),
          eq(workflowSteps.stepName, name),
          eq(workflowSteps.status, "completed"),
        ),
      )
      .limit(1);

    if (existing) {
      // SAFETY: a completed step row's output was produced by this step's own handler in a prior run.
      return existing.output as TResult;
    }

    const stepId = generateId();
    const startedAt = new Date();

    await this.db.insert(workflowSteps).values({
      id: stepId,
      runId,
      startedAt,
      status: "running",
      stepName: name,
    });

    let firstError: unknown = undefined;
    let lastError = new Error("workflow step failed");

    // oxlint-disable eslint/no-await-in-loop
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();
        const completedAt = new Date();

        await this.db
          .update(workflowSteps)
          .set({
            attempt,
            completedAt,
            durationMs: completedAt.getTime() - startedAt.getTime(),
            output: result ?? null,
            status: "completed",
          })
          .where(eq(workflowSteps.id, stepId));

        return result;
      } catch (error) {
        if (!firstError) {
          firstError = error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts) {
          await this.db
            .update(workflowSteps)
            .set({
              attempt,
              error: serializeError(error instanceof Error ? error : new Error(String(error))),
              status: "running",
            })
            .where(eq(workflowSteps.id, stepId));
        }
      }
    }
    // oxlint-enable eslint/no-await-in-loop

    const completedAt = new Date();

    // Preserve the root cause from the first attempt so the persisted chain
    // explains why retries did not recover, when retries were configured.
    const rootCause =
      maxAttempts > 1 && firstError && firstError !== lastError ? firstError : undefined;
    if (rootCause !== undefined && lastError.cause === undefined) {
      lastError.cause = rootCause;
    }

    const serialized = serializeError(lastError);
    serialized.attempts = maxAttempts;

    await this.db
      .update(workflowSteps)
      .set({
        attempt: maxAttempts,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        error: serialized,
        status: "failed",
      })
      .where(eq(workflowSteps.id, stepId));

    log?.error(`Workflow step "${name}" failed after ${maxAttempts} attempt(s)`, lastError, {
      attempts: maxAttempts,
      runId,
      stepName: name,
    });

    throw lastError;
  }

  /** Executes a workflow from start to (completed or failed) persistence. */
  public async run<TInput, TOutput, TSchemas extends SchemaMap = Record<string, never>>(
    config: WorkflowConfig<TInput, TOutput, TSchemas>,
    input: TInput,
    context?: Context,
  ): Promise<TOutput> {
    console.log("Workflow Step", { context });
    const store = context ?? getContext();
    const { actorId, audit, db, pubsub, auth } = store;

    if (config.schema) {
      input = await validateInput(config.schema, input);
    }
    const runId = generateId();
    const startedAt = new Date();
    const log = store.log.child({ runId, workflowName: config.name });
    log.info(`Workflow "${config.name}" started`, { runId });

    await db.insert(workflowRuns).values({
      id: runId,
      input: input ?? null,
      startedAt,
      status: "running",
      workflowName: config.name,
    });

    const ctx: WorkflowContext<TSchemas> = {
      actorId,
      audit,
      auth,
      // @ts-expect-error
      config,
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
        durationMs: completedAt.getTime() - startedAt.getTime(),
        runId,
      });

      await db
        .update(workflowRuns)
        .set({
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
          output: output ?? null,
          status: "completed",
        })
        .where(eq(workflowRuns.id, runId));

      return output;
    } catch (error) {
      const completedAt = new Date();

      log.error(
        `Workflow "${config.name}" failed`,
        error instanceof Error ? error : new Error(String(error)),
        {
          durationMs: completedAt.getTime() - startedAt.getTime(),
          runId,
        },
      );

      await db
        .update(workflowRuns)
        .set({
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
          error: serializeError(error instanceof Error ? error : new Error(String(error))),
          status: "failed",
        })
        .where(eq(workflowRuns.id, runId));

      throw error;
    }
  }
}

/** Per-run step runner: dispatches named or structured steps onto the engine, plus `sleep`. */
class WorkflowRunner<TSchemas extends SchemaMap> implements StepRunner {
  private readonly engine: WorkflowEngine;
  private readonly getCtx: () => WorkflowContext<TSchemas>;
  private readonly runId: string;

  readonly run: StepRunner["run"];

  constructor(engine: WorkflowEngine, getCtx: () => WorkflowContext<TSchemas>, runId: string) {
    this.engine = engine;
    this.getCtx = getCtx;
    this.runId = runId;

    // SAFETY: the generic arrow below is shaped exactly like StepRunner.run's two overloads.
    this.run = async <TValue>(
      nameOrStep: string | WorkflowStepInstance<unknown, unknown, TSchemas>,
      fnOrInput: (() => TValue | Promise<TValue>) | TValue,
      options?: StepOptions,
    ) => {
      if (nameOrStep instanceof Object && "handler" in nameOrStep) {
        const step = nameOrStep;
        const input = fnOrInput;
        return this.engine.executeStep({
          fn: async () => {
            if (!step.schema) {
              return step.handler(input, this.getCtx());
            }
            const validated = await validateInput(step.schema, input);
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
      // SAFETY: the instanceof Function check above establishes the handler contract.
      return this.engine.executeStep({
        fn: fnOrInput,
        log: this.getCtx().log,
        name: nameOrStep,
        options,
        runId: this.runId,
      });
      // SAFETY: the branching above covers both overload shapes of StepRunner.run.
    };
  }

  async sleep(ms: number): Promise<void> {
    await sleep(ms);
  }
}

export async function executeWorkflow<
  TInput,
  TOutput,
  TSchemas extends SchemaMap = Record<string, never>,
>(
  config: WorkflowConfig<TInput, TOutput, TSchemas>,
  input: TInput,
  context?: Context,
): Promise<TOutput> {
  console.log("Workflow", { context });
  // Resolve the store once and hand it to the engine so run persistence uses the same db.
  const store = context ?? getContext();
  return new WorkflowEngine(store.db).run(config, input, store);
}

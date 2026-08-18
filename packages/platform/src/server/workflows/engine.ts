import { workflowRuns, workflowSteps } from "#/server/db/schema";
import type { SchemaMap } from "#/server/types";
import { getContext } from "#/server/utils";
import { setTimeout as sleep } from "node:timers/promises";

import { SchemaError } from "@standard-schema/utils";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type {
  RunOptions,
  StandardSchema,
  StepOptions,
  StepRunner,
  WorkflowConfig,
  WorkflowContext,
  WorkflowStepInstance,
} from "./types";

type DrizzleDB<TSchemas extends SchemaMap = Record<string, never>> = PostgresJsDatabase<TSchemas>;

function generateId(): string {
  return crypto.randomUUID();
}

/** The JSON-serializable error envelope stored on workflow step/run rows. */
export interface SerializedError {
  message: string;
  name: string;
  stack?: string;
}

function serializeError(error: Error): SerializedError {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
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

async function executeStep<TSchemas extends SchemaMap, TResult>(input: {
  db: DrizzleDB<TSchemas>;
  runId: string;
  name: string;
  fn: () => TResult | Promise<TResult>;
  options?: StepOptions;
}): Promise<TResult> {
  const { db, runId, name, fn, options } = input;
  const maxAttempts = (options?.retries ?? 0) + 1;

  const [existing] = await db
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

  await db.insert(workflowSteps).values({
    id: stepId,
    runId,
    startedAt,
    status: "running",
    stepName: name,
  });

  let lastError = new Error("workflow step failed");

  // oxlint-disable eslint/no-await-in-loop
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      const completedAt = new Date();

      await db
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
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        await db
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

  await db
    .update(workflowSteps)
    .set({
      attempt: maxAttempts,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      error: serializeError(lastError),
      status: "failed",
    })
    .where(eq(workflowSteps.id, stepId));

  throw lastError;
}

function createStepRunner<TSchemas extends SchemaMap>(
  db: DrizzleDB<TSchemas>,
  getCtx: () => WorkflowContext<TSchemas>,
  runId: string,
): StepRunner {
  return {
    // SAFETY: the generic implementation below is shaped exactly like StepRunner.run's two overloads.
    run: (async <TValue>(
      nameOrStep: string | WorkflowStepInstance<unknown, unknown, TSchemas>,
      fnOrInput: (() => TValue | Promise<TValue>) | TValue,
      options?: StepOptions,
    ) => {
      if (nameOrStep instanceof Object && "handler" in nameOrStep) {
        const step = nameOrStep;
        const input = fnOrInput;
        return executeStep({
          db,
          fn: async () => {
            if (!step.schema) {
              return step.handler(input, getCtx());
            }
            const validated = await validateInput(step.schema, input);
            return step.handler(validated, getCtx());
          },
          name: step.name,
          options,
          runId,
        });
      }
      if (!(fnOrInput instanceof Function)) {
        throw new Error(`Step "${nameOrStep}" requires a function handler`);
      }
      // SAFETY: the instanceof Function check above establishes the handler contract.
      return executeStep({
        db,
        fn: fnOrInput,
        name: nameOrStep,
        options,
        runId,
      });
      // SAFETY: the dispatch branches cover both overload shapes of StepRunner.run.
    }) as StepRunner["run"],
    async sleep(ms: number): Promise<void> {
      await sleep(ms);
    },
  };
}

export async function executeWorkflow<
  TInput,
  TOutput,
  TSchemas extends SchemaMap = Record<string, never>,
>(
  config: WorkflowConfig<TInput, TOutput, TSchemas>,
  input: TInput,
  options?: RunOptions,
): Promise<TOutput> {
  const store = options?.db ? null : getContext();
  const db = options?.db ?? store?.db;
  const audit = options?.audit ?? store?.audit;
  const auth = options?.auth ?? store?.auth;
  const pubsub = options?.pubsub ?? store?.pubsub;

  if (!db || !pubsub) {
    throw new Error(
      "Workflow requires db and pubsub — pass via RunOptions or ensure context is active",
    );
  }
  if (!audit) {
    throw new Error("Workflow requires audit — pass via RunOptions or ensure context is active");
  }

  if (config.schema) {
    input = await validateInput(config.schema, input);
  }

  const runId = generateId();
  const startedAt = new Date();

  await db.insert(workflowRuns).values({
    id: runId,
    input: input ?? null,
    startedAt,
    status: "running",
    workflowName: config.name,
  });

  const ctx: WorkflowContext<TSchemas> = {
    actorId: options?.actorId ?? store?.actorId,
    audit,
    auth,
    config: options?.config ?? {},
    // SAFETY: the resolved db is a valid postgres-js drizzle instance for the merged schemas.
    db: db as DrizzleDB<TSchemas>,
    pubsub,
    runId,
    // SAFETY: the step runner resolves the same context and db for every step invocation.
    step: createStepRunner(db as DrizzleDB<TSchemas>, () => ctx, runId),
  };

  try {
    const output = await config.handler(input, ctx);
    const completedAt = new Date();

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

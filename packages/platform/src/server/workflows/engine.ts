import { SchemaError } from "@standard-schema/utils";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { getContext } from "../utils/context";
import { workflowRuns, workflowSteps } from "./db-schema";
import type {
  RunOptions,
  StandardSchema,
  StepOptions,
  StepRunner,
  WorkflowConfig,
  WorkflowContext,
  WorkflowStepInstance,
} from "./types";

type DrizzleDB<TSchemas extends Record<string, unknown> = Record<string, unknown>> =
  NodePgDatabase<TSchemas>;

function generateId(): string {
  return crypto.randomUUID();
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  return { message: String(error), name: "Error" };
}

async function validateInput(schema: StandardSchema, input: unknown): Promise<unknown> {
  const result = await schema["~standard"].validate(input);

  if (result.issues) {
    throw new SchemaError(result.issues);
  }

  return result.value;
}

async function executeStep<TSchemas extends Record<string, unknown>, TResult>(input: {
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

  let lastError: unknown = undefined;

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
      lastError = error;

      if (attempt < maxAttempts) {
        await db
          .update(workflowSteps)
          .set({
            attempt,
            error: serializeError(error),
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

function createStepRunner<TSchemas extends Record<string, unknown>>(
  db: DrizzleDB<TSchemas>,
  getCtx: () => WorkflowContext<TSchemas>,
  runId: string,
): StepRunner {
  return {
    run: ((
      nameOrStep: string | WorkflowStepInstance<unknown, unknown, TSchemas>,
      fnOrInput: (() => unknown) | unknown,
      options?: StepOptions,
    ) => {
      if (typeof nameOrStep === "string") {
        return executeStep({
          db,
          fn: fnOrInput as () => unknown,
          name: nameOrStep,
          options,
          runId,
        });
      }
      const step = nameOrStep;
      const input = fnOrInput;
      return executeStep({
        db,
        fn: async () => {
          let validated = input;
          if (step.schema) {
            validated = await validateInput(step.schema, input);
          }
          return step.handler(validated, getCtx());
        },
        name: step.name,
        options,
        runId,
      });
    }) as StepRunner["run"],
    async sleep(ms: number): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, ms));
    },
  };
}

export async function executeWorkflow<
  TInput,
  TOutput,
  TSchemas extends Record<string, unknown> = Record<string, never>,
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
    input = (await validateInput(config.schema, input)) as TInput;
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
    db: db as DrizzleDB<TSchemas>,
    pubsub,
    runId,
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
        error: serializeError(error),
        status: "failed",
      })
      .where(eq(workflowRuns.id, runId));

    throw error;
  }
}

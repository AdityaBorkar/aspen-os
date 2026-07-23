import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { getContext } from "../context";
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

type DrizzleDB = NodePgDatabase<Record<string, never>>;

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

async function validateInput<T>(
  schema: StandardSchema,
  input: unknown,
): Promise<T> {
  const result = schema["~standard"].validate(input) as
    | {
        success: boolean;
        value?: unknown;
        issues?: ReadonlyArray<{ message: string }>;
      }
    | Promise<{
        success: boolean;
        value?: unknown;
        issues?: ReadonlyArray<{ message: string }>;
      }>;
  const awaited = result instanceof Promise ? await result : result;
  if (!awaited.success) {
    const issues = (awaited.issues ?? []).map((i) => i.message).join("; ");
    throw new Error(`Input validation failed: ${issues}`);
  }
  return awaited.value as T;
}

async function executeStep<T>(
  db: DrizzleDB,
  runId: string,
  name: string,
  fn: () => T | Promise<T>,
  options?: StepOptions,
): Promise<T> {
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
    return existing.output as T;
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

  let lastError: unknown;

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

function createStepRunner(
  db: DrizzleDB,
  getCtx: () => WorkflowContext,
  runId: string,
): StepRunner {
  return {
    run: ((
      nameOrStep: string | WorkflowStepInstance<unknown, unknown>,
      fnOrInput: (() => unknown) | unknown,
      options?: StepOptions,
    ) => {
      if (typeof nameOrStep === "string") {
        return executeStep(
          db,
          runId,
          nameOrStep,
          fnOrInput as () => unknown,
          options,
        );
      }
      const step = nameOrStep;
      const input = fnOrInput;
      return executeStep(
        db,
        runId,
        step.name,
        async () => {
          let validated = input;
          if (step.schema) {
            validated = await validateInput(step.schema, input);
          }
          return step.handler(validated, getCtx());
        },
        options,
      );
    }) as StepRunner["run"],
    async sleep(ms: number): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, ms));
    },
  };
}

export async function executeWorkflow<TInput, TOutput>(
  config: WorkflowConfig<TInput, TOutput>,
  input: TInput,
  options?: RunOptions,
): Promise<TOutput> {
  const store = options?.db ? null : getContext();
  const db = options?.db ?? store?.db;
  const auth = options?.auth ?? store?.auth;
  const pubsub = options?.pubsub ?? store?.pubsub;

  if (!db || !pubsub) {
    throw new Error(
      "Workflow requires db and pubsub — pass via RunOptions or ensure context is active",
    );
  }

  if (config.schema) {
    input = await validateInput<TInput>(config.schema, input);
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

  let ctx: WorkflowContext;
  const getCtx = () => ctx;
  ctx = {
    auth,
    config: options?.config ?? {},
    db,
    pubsub,
    step: createStepRunner(db, getCtx, runId),
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

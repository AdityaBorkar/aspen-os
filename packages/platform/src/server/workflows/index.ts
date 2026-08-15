import { executeWorkflow } from "#/server/workflows/engine";
import type {
  InferSchemaOutput,
  RunOptions,
  StandardSchema,
  WorkflowContext,
  WorkflowInstance,
  WorkflowStepInstance,
} from "#/server/workflows/types";

export { workflowRuns, workflowSteps } from "#/server/workflows/db-schema";
export { executeWorkflow } from "#/server/workflows/engine";
export type {
  InferSchemaOutput,
  RunOptions,
  StandardSchema,
  StepOptions,
  StepRunner,
  WorkflowConfig,
  WorkflowContext,
  WorkflowInstance,
  WorkflowRunStatus,
  WorkflowStepInstance,
  WorkflowStepStatus,
} from "#/server/workflows/types";

function createWorkflow<TInput, TOutput>(config: {
  name: string;
  handler: (input: TInput, ctx: WorkflowContext) => Promise<TOutput>;
  schema?: StandardSchema<unknown, TInput>;
}): WorkflowInstance<TInput, TOutput> {
  return {
    name: config.name,
    async run(input: TInput, options?: RunOptions): Promise<TOutput> {
      return executeWorkflow(config, input, options);
    },
  };
}

export const Workflow = {
  name(workflowName: string) {
    return {
      handler<TInput, TOutput>(
        fn: (input: TInput, ctx: WorkflowContext) => Promise<TOutput>,
      ): WorkflowInstance<TInput, TOutput> {
        return createWorkflow<TInput, TOutput>({
          handler: fn,
          name: workflowName,
        });
      },
      input<TSchema extends StandardSchema>(schema: TSchema) {
        type TInput = InferSchemaOutput<TSchema>;
        return {
          handler<TOutput>(
            fn: (input: TInput, ctx: WorkflowContext) => Promise<TOutput>,
          ): WorkflowInstance<TInput, TOutput> {
            return createWorkflow<TInput, TOutput>({
              handler: fn,
              name: workflowName,
              schema,
            });
          },
        };
      },
    };
  },
};

export const WorkflowStep = {
  name(stepName: string) {
    return {
      handler<TInput, TOutput>(
        fn: (input: TInput, ctx: WorkflowContext) => Promise<TOutput>,
      ): WorkflowStepInstance<TInput, TOutput> {
        return { handler: fn, name: stepName };
      },
      input<TSchema extends StandardSchema>(schema: TSchema) {
        type TInput = InferSchemaOutput<TSchema>;
        return {
          handler<TOutput>(
            fn: (input: TInput, ctx: WorkflowContext) => Promise<TOutput>,
          ): WorkflowStepInstance<TInput, TOutput> {
            return {
              handler: fn,
              name: stepName,
              schema,
            };
          },
        };
      },
    };
  },
};

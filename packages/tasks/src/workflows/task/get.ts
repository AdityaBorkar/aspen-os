import { IdSchema } from "#/types";
import { fetchTaskStep } from "#/workflow-steps/fetch-task";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getTask = Workflow.name("task.get")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => ctx.step.run(fetchTaskStep, { id }));

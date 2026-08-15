import { IdSchema } from "#/types";
import { fetchStatusStep } from "#/workflow-steps/fetch-status";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getStatus = Workflow.name("status.get")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => ctx.step.run(fetchStatusStep, { id }));

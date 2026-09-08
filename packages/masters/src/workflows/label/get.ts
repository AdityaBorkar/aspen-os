import { IdSchema } from "#/types";
import { fetchLabelStep } from "#/workflow-steps/fetch-label";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ id: IdSchema });

export const getLabel = Workflow.name("masters.label.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchLabelStep, { id }));

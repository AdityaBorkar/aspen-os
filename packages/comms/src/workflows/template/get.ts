import { IdSchema } from "#/types";
import { fetchTemplateStep } from "#/workflow-steps/fetch-template";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ input: object({ id: IdSchema }) });

export const getTemplate = Workflow.name("comms.template.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => ctx.step.run(fetchTemplateStep, { id: input.id }));

import { IdSchema } from "#/schemas";
import { fetchGroupStep } from "#/workflow-steps/fetch-group";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ id: IdSchema });

export const getGroup = Workflow.name("products.group.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchGroupStep, { id }));

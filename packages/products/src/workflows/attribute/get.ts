import { IdSchema } from "#/schemas";
import { fetchAttributeStep } from "#/workflow-steps/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ id: IdSchema });

export const getAttribute = Workflow.name("products.attribute.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchAttributeStep, { id }));

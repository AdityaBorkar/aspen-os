import { IdSchema } from "#/schemas";
import { fetchItemStep } from "#/workflow-steps/fetch-item";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ id: IdSchema });

export const getItem = Workflow.name("products.item.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchItemStep, { id }));

import { IdSchema } from "#/schemas";
import { fetchPriceListStep } from "#/workflow-steps/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ id: IdSchema });

export const getPriceList = Workflow.name("products.price-list.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchPriceListStep, { id }));

import { IdSchema } from "#/schemas";
import { fetchItemPriceStep } from "#/workflow-steps/fetch-item-price";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ id: IdSchema });

export const getItemPrice = Workflow.name("products.item-price.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchItemPriceStep, { id }));

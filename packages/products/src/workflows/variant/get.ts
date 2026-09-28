import { IdSchema } from "#/schemas";
import { fetchItemStep } from "#/workflow-steps/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ id: IdSchema });

export const getVariant = Workflow.name("products.variant.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => {
    const row = await ctx.step.run(fetchItemStep, { id });
    if (!row.template_item_id) {
      throw new Error(`Item with id "${id}" is not a variant.`);
    }
    return row;
  });

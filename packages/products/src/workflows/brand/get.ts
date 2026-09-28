import { IdSchema } from "#/schemas";
import { fetchBrandStep } from "#/workflow-steps/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ id: IdSchema });

export const getBrand = Workflow.name("products.brand.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchBrandStep, { id }));

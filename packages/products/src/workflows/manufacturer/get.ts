import { IdSchema } from "#/schemas";
import { fetchManufacturerStep } from "#/workflow-steps/fetch-manufacturer";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ id: IdSchema });

export const getManufacturer = Workflow.name("products.manufacturer.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchManufacturerStep, { id }));

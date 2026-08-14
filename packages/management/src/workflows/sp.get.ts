import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../types";
import { fetchServiceProviderStep } from "./steps/fetch-sp";

export const getSp = Workflow.name("sp.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => ctx.step.run(fetchServiceProviderStep, { id: input.id }));

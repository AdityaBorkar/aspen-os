import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../types";
import { fetchTenantStep } from "./steps/fetch-tenant";

export const getTenant = Workflow.name("tenant.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    return ctx.step.run(fetchTenantStep, input);
  });

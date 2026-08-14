import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../../types";
import { fetchTenantStep } from "../../workflow-steps/fetch-tenant";

export const getTenant = Workflow.name("tenant.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => ctx.step.run(fetchTenantStep, input));

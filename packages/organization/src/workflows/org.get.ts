import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { fetchOrganizationStep } from "./steps/fetch-organization";

export const getOrganization = Workflow.name("org.get")
  .input(object({}))
  .handler(async (_input, ctx) => {
    return ctx.step.run(fetchOrganizationStep, {});
  });

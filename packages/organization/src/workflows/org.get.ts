import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { fetchOrganizationStep } from "../workflow-steps/fetch-organization";

export const getOrganization = Workflow.name("org.get")
  .input(object({}))
  .handler(async (_input, ctx) => ctx.step.run(fetchOrganizationStep, {}));

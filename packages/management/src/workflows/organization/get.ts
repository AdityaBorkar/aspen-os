import { IdSchema } from "#/types";
import { fetchOrganizationStep } from "#/workflow-steps/fetch-organization";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getOrganization = Workflow.name("organization.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => ctx.step.run(fetchOrganizationStep, { id: input.id }));

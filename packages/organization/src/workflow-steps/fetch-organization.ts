import { organization } from "#/db-schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { object } from "valibot";

export const fetchOrganizationStep = WorkflowStep.name("fetch-organization")
  .input(object({}))
  .handler(async (_input, ctx) => {
    const [org] = await ctx.db.select().from(organization).limit(1);
    return org ?? null;
  });

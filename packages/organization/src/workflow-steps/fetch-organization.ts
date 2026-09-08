import { organization } from "#/db-schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { asc } from "drizzle-orm";
import { object } from "valibot";

export const fetchOrganizationStep = WorkflowStep.name("fetch-organization")
  .input(object({}))
  .handler(async (_input, ctx) => {
    const [org] = await ctx.db
      .select()
      .from(organization)
      .orderBy(asc(organization.created_at))
      .limit(1);
    return org ?? null;
  });

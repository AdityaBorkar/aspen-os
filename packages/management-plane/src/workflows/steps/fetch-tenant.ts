import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { organization, tenant } from "../../db-schemas";
import { IdSchema } from "../../types";

export const fetchTenantStep = WorkflowStep.name("fetch-tenant")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [org] = await ctx.db
      .select()
      .from(organization)
      .where(eq(organization.id, input.id))
      .limit(1);

    if (!org) {
      throw new Error(`Tenant with id "${input.id}" not found.`);
    }

    const [companion] = await ctx.db
      .select()
      .from(tenant)
      .where(eq(tenant.id, input.id))
      .limit(1);

    return { ...org, ...companion };
  });

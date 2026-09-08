import { managedOrganization } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchOrganizationStep = WorkflowStep.name("fetch-organization")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(managedOrganization)
      .where(eq(managedOrganization.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Organization with id "${input.id}" not found.`);
    }

    return result;
  });

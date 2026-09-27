import { managedOrganization } from "#/db-schemas";
import { IdSchema } from "#/types";
import { tenantProjection } from "#/workflow-steps/tenant-projection";

import { WorkflowStep } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchOrganizationStep = WorkflowStep.name("fetch-organization")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select(tenantProjection)
      .from(organization)
      .innerJoin(managedOrganization, eq(managedOrganization.id, organization.id))
      .where(eq(organization.id, input.id))
      .limit(1);

    if (!row) {
      throw new Error(`Organization with id "${input.id}" not found.`);
    }

    return row;
  });

import { tenant } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";
import { object } from "valibot";

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

    const [companion] = await ctx.db.select().from(tenant).where(eq(tenant.id, input.id)).limit(1);

    return {
      churnReason: companion?.churnReason ?? null,
      churnedAt: companion?.churnedAt ?? null,
      createdAt: org.createdAt,
      databaseHost: companion?.databaseHost ?? null,
      databaseName: companion?.databaseName ?? null,
      databasePassword: companion?.databasePassword ?? null,
      databasePort: companion?.databasePort ?? null,
      databaseSsl: companion?.databaseSsl ?? null,
      databaseUser: companion?.databaseUser ?? null,
      id: org.id,
      logo: org.logo,
      metadata: org.metadata,
      name: org.name,
      plan: companion?.plan ?? null,
      serviceProviderId: companion?.serviceProviderId ?? null,
      signupAt: companion?.signupAt ?? null,
      slug: org.slug,
      status: companion?.status ?? null,
      suspendedAt: companion?.suspendedAt ?? null,
      suspendedReason: companion?.suspendedReason ?? null,
      updatedAt: companion?.updatedAt ?? null,
    };
  });

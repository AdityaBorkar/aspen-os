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
      churnReason: companion?.churn_reason ?? null,
      churnedAt: companion?.churned_at ?? null,
      createdAt: org.created_at,
      databaseHost: companion?.database_host ?? null,
      databaseName: companion?.database_name ?? null,
      databasePassword: companion?.database_password ?? null,
      databasePort: companion?.database_port ?? null,
      databaseSsl: companion?.database_ssl ?? null,
      databaseUser: companion?.database_user ?? null,
      id: org.id,
      logo: org.logo,
      metadata: org.metadata,
      name: org.name,
      plan: companion?.plan ?? null,
      serviceProviderId: companion?.service_provider_id ?? null,
      signupAt: companion?.signup_at ?? null,
      slug: org.slug,
      status: companion?.status ?? null,
      suspendedAt: companion?.suspended_at ?? null,
      suspendedReason: companion?.suspended_reason ?? null,
      updatedAt: companion?.updated_at ?? null,
    };
  });

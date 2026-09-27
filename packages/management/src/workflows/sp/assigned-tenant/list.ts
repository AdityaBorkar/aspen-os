import { managedOrganization } from "#/db-schemas";
import { IdSchema, LimitSchema, OffsetSchema } from "#/types";
import { requireServiceProvider } from "#/utils/require-sp";

import { Workflow } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { asc, eq } from "drizzle-orm";
import { object } from "valibot";

export const listAssignedTenants = Workflow.name("sp.assigned-tenants")
  .input(
    object({
      limit: LimitSchema,
      offset: OffsetSchema,
      spId: IdSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const { spId } = input;

    await requireServiceProvider(ctx, spId);

    return ctx.step.run("query", async () =>
      ctx.db
        .select({
          createdAt: organization.createdAt,
          id: organization.id,
          logo: organization.logo,
          name: organization.name,
          plan: managedOrganization.plan,
          serviceProviderId: managedOrganization.service_provider_id,
          signupAt: managedOrganization.signup_at,
          slug: organization.slug,
          status: managedOrganization.status,
        })
        .from(managedOrganization)
        .innerJoin(organization, eq(organization.id, managedOrganization.id))
        .where(eq(managedOrganization.service_provider_id, spId))
        .orderBy(asc(managedOrganization.id))
        .limit(input.limit ?? 50)
        .offset(input.offset ?? 0),
    );
  });

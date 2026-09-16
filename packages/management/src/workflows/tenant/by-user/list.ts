import { TenantsByUserListInputSchema } from "#/schemas/tenant-member";

import { Workflow } from "@aspen-os/platform/server";
import { member, organization } from "@aspen-os/platform/server/db-schemas";
import { asc, eq } from "drizzle-orm";

/**
 * Branding list of workspaces a user belongs to, for the
 * authenticated organization picker. Scoped by `userId` from
 * the session; no headers required.
 */
export const listTenantsByUser = Workflow.name("tenant.list-by-user")
  .input(TenantsByUserListInputSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select({
          id: organization.id,
          logo: organization.logo,
          name: organization.name,
          slug: organization.slug,
        })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(eq(member.userId, input.userId))
        .orderBy(asc(organization.name)),
    ),
  );

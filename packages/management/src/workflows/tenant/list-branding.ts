import { LimitSchema, OffsetSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { asc } from "drizzle-orm";
import { object } from "valibot";

/**
 * Public branding list for the logged-out organization picker. Needs no
 * session. Returns `{ id, logo, name, slug }` ordered by name; branding-only
 * on purpose, use `tenant.list` for tenant state (plan, status).
 */
export const listTenantBranding = Workflow.name("tenant.list-branding")
  .input(object({ limit: LimitSchema, offset: OffsetSchema }))
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select({
          id: organization.id,
          logo: organization.logo,
          name: organization.name,
          slug: organization.slug,
        })
        .from(organization)
        .orderBy(asc(organization.name))
        .limit(input.limit ?? 50)
        .offset(input.offset ?? 0),
    ),
  );

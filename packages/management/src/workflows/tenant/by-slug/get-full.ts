import { SlugSchema } from "#/types";
import { fetchTenantStep } from "#/workflow-steps/fetch-tenant";

import { Workflow } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";
import { object } from "valibot";

/**
 * Full tenant read by slug for authenticated workspace surfaces
 * (settings, guards). Throws when no organization uses the slug;
 * use `tenants.getBySlug` for logged-out branding lookups that
 * return `null` instead.
 */
export const getTenantFullBySlug = Workflow.name("tenant.get-full-by-slug")
  .input(object({ slug: SlugSchema }))
  .handler(async (input, ctx) => {
    const organizationId = await ctx.step.run("resolve-id", async () => {
      const [row] = await ctx.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.slug, input.slug))
        .limit(1);

      if (!row) {
        throw new Error("Workspace not found");
      }

      return row.id;
    });

    return ctx.step.run(fetchTenantStep, { id: organizationId });
  });

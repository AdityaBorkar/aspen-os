import { SlugSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";
import { object } from "valibot";

/**
 * Public branding lookup for logged-out surfaces (login page, tenant guard).
 * Needs no session: `slug` is unique, so this is an exact match returning
 * `null` when no organization uses the slug. `metadata` is returned as
 * stored (JSON text or null); callers parse it.
 */
export const getTenantBySlug = Workflow.name("tenant.get-by-slug")
  .input(object({ slug: SlugSchema }))
  .handler(async ({ slug }, ctx) =>
    ctx.step.run("query", async () => {
      const [row] = await ctx.db
        .select({
          createdAt: organization.createdAt,
          id: organization.id,
          logo: organization.logo,
          metadata: organization.metadata,
          name: organization.name,
          slug: organization.slug,
        })
        .from(organization)
        .where(eq(organization.slug, slug))
        .limit(1);

      return row ?? null;
    }),
  );

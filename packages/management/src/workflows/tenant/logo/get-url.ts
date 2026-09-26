import { LogoUrlSchema } from "#/schemas/logo";
import { getLogoSignedUrl } from "#/services/logo-storage";

import { Workflow } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";

/**
 * Resolve a signed display URL for a tenant logo.
 *
 * Reads the Storage reference from `organization.logo` and mints a short-lived
 * GET URL. Returns `{ key: null, url: null }` when no logo is set.
 */
export const getTenantLogoUrl = Workflow.name("tenant.logo.get-url")
  .input(LogoUrlSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("resolve-url", async () => {
      const [row] = await ctx.db
        .select({ logo: organization.logo })
        .from(organization)
        .where(eq(organization.id, input.id))
        .limit(1);
      if (!row) {
        throw new Error(`Tenant with id "${input.id}" not found.`);
      }
      if (!row.logo) {
        return { key: null, url: null };
      }
      const url = await getLogoSignedUrl(row.logo, input.expiresIn ?? 3600);
      return { key: row.logo, url };
    }),
  );

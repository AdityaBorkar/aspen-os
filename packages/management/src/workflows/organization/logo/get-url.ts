import { LogoUrlSchema } from "#/schemas/logo";
import { getLogoSignedUrl } from "#/services/logo-storage";
import { readBrandingLogo } from "#/services/organization-branding";
import { fetchOrganizationStep } from "#/workflow-steps/fetch-organization";

import { Workflow } from "@aspen-os/platform/server";

/**
 * Resolve a signed display URL for a managed-organization logo.
 *
 * Reads the Storage reference from `managed_organization.branding.logo`.
 * Returns `{ key: null, url: null }` when no logo is set.
 */
export const getOrganizationLogoUrl = Workflow.name("organization.logo.get-url")
  .input(LogoUrlSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchOrganizationStep, { id: input.id });
    const key = await ctx.step.run("read-reference", async () =>
      readBrandingLogo(current.branding),
    );
    if (!key) {
      return { key: null, url: null };
    }
    const url = await ctx.step.run("sign-url", async () =>
      getLogoSignedUrl(key, input.expiresIn ?? 3600),
    );
    return { key, url };
  });

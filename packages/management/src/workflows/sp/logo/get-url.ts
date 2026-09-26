import { LogoUrlSchema } from "#/schemas/logo";
import { getLogoSignedUrl } from "#/services/logo-storage";
import { fetchServiceProviderStep } from "#/workflow-steps/fetch-sp";

import { Workflow } from "@aspen-os/platform/server";

/**
 * Resolve a signed display URL for a service-provider logo.
 *
 * Returns `{ key: null, url: null }` when no logo is set.
 */
export const getServiceProviderLogoUrl = Workflow.name("sp.logo.get-url")
  .input(LogoUrlSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchServiceProviderStep, { id: input.id });
    const logoKey = current.logo;
    if (!logoKey) {
      return { key: null, url: null };
    }
    const url = await ctx.step.run("sign-url", async () =>
      getLogoSignedUrl(logoKey, input.expiresIn ?? 3600),
    );
    return { key: logoKey, url };
  });

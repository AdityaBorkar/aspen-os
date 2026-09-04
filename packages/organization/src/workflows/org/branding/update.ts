import { ORGANIZATION_EVENTS } from "#/pubsub";
import { UpdateBrandingSchema } from "#/types";
import { applyOrganizationUpdate, requireCurrentOrganization } from "#/workflows/org/utils";
import { collectChanges } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";

export const updateBranding = Workflow.name("org.update-branding")
  .input(UpdateBrandingSchema)
  .handler(async (input, ctx) => {
    const values = {
      accentColor: input.accentColor,
      logo: input.logo,
      name: input.name,
    };

    if (Object.values(values).every((value) => value === undefined)) {
      return requireCurrentOrganization(ctx.step);
    }

    const updated = await applyOrganizationUpdate(ctx, values);

    await ctx.pubsub.publish(ORGANIZATION_EVENTS.BRANDING_UPDATED, collectChanges(values));

    return updated;
  });

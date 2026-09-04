import { ORGANIZATION_EVENTS } from "#/pubsub";
import { applyOrganizationUpdate } from "#/workflows/org/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const deleteLogo = Workflow.name("org.delete-logo")
  .input(object({}))
  .handler(async (_input, ctx) => {
    const updated = await applyOrganizationUpdate(ctx, { logo: null });

    await ctx.pubsub.publish(ORGANIZATION_EVENTS.BRANDING_UPDATED, { logo: null });

    return updated;
  });

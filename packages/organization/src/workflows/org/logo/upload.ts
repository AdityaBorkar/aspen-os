import { ORGANIZATION_EVENTS } from "#/pubsub";
import { applyOrganizationUpdate } from "#/workflows/org/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

export const uploadLogo = Workflow.name("org.upload-logo")
  .input(object({ storageKey: string() }))
  .handler(async (input, ctx) => {
    const updated = await applyOrganizationUpdate(ctx, { logo: input.storageKey });

    await ctx.pubsub.publish(ORGANIZATION_EVENTS.BRANDING_UPDATED, { logo: input.storageKey });

    return updated;
  });

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { organization } from "../db-schemas";
import { ORGANIZATION_EVENTS } from "../pubsub";
import { UpdateBrandingSchema } from "../types";
import { fetchOrganizationStep } from "./steps/fetch-organization";

export const updateBranding = Workflow.name("org.update-branding")
  .input(UpdateBrandingSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchOrganizationStep, {});
    if (!current) {
      throw new Error("Organization not found. Create one first.");
    }

    const [updated] = await ctx.db
      .update(organization)
      .set({
        accentColor: input.accentColor ?? current.accentColor,
        logo: input.logo ?? current.logo,
        name: input.name ?? current.name,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, current.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update branding.");
    }

    await ctx.pubsub.publish(ORGANIZATION_EVENTS.BRANDING_UPDATED, {
      accentColor: input.accentColor,
      logo: input.logo,
      name: input.name,
    });

    return updated;
  });

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { organization } from "../db-schemas";
import { fetchOrganizationStep } from "./steps/fetch-organization";

export const uploadLogo = Workflow.name("org.upload-logo")
  .input(object({ storageKey: string() }))
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchOrganizationStep, {});
    if (!current) {
      throw new Error("Organization not found. Create one first.");
    }

    const [updated] = await ctx.db
      .update(organization)
      .set({ logo: input.storageKey, updatedAt: new Date() })
      .where(eq(organization.id, current.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to upload logo.");
    }

    return updated;
  });

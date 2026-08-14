import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { organization } from "../db-schemas";
import { fetchOrganizationStep } from "../workflow-steps/fetch-organization";

export const deleteLogo = Workflow.name("org.delete-logo")
  .input(object({}))
  .handler(async (_input, ctx) => {
    const current = await ctx.step.run(fetchOrganizationStep, {});
    if (!current) {
      throw new Error("Organization not found. Create one first.");
    }

    const [updated] = await ctx.db
      .update(organization)
      .set({ logo: null, updatedAt: new Date() })
      .where(eq(organization.id, current.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to delete logo.");
    }

    return updated;
  });

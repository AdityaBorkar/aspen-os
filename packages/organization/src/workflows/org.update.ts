import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { organization } from "../db-schemas";
import { ORGANIZATION_EVENTS } from "../pubsub";
import { UpdateOrganizationSchema } from "../types";
import { stripUndefined } from "../utils/strip-undefined";
import { fetchOrganizationStep } from "./steps/fetch-organization";

export const updateOrganization = Workflow.name("org.update")
  .input(UpdateOrganizationSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchOrganizationStep, {});
    if (!current) {
      throw new Error("Organization not found. Create one first.");
    }

    const data = stripUndefined(input as Record<string, unknown>);

    if (Object.keys(data).length === 0) {
      return current;
    }

    if (input.slug !== undefined) {
      const [conflict] = await ctx.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.slug, input.slug))
        .limit(1);

      if (conflict && conflict.id !== current.id) {
        throw new Error(`Organization with slug "${input.slug}" already exists.`);
      }
    }

    const [updated] = await ctx.db
      .update(organization)
      .set({
        ...data,
        foundedDate: input.foundedDate?.toISOString().split("T")[0] ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, current.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update organization.");
    }

    await ctx.pubsub.publish(ORGANIZATION_EVENTS.UPDATED, {
      changes: data,
      organization: { id: updated.id, name: updated.name, slug: updated.slug },
    });

    return updated;
  });

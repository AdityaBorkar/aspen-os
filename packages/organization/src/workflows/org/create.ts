import { organization } from "#/db-schemas";
import { ORGANIZATION_EVENTS } from "#/pubsub";
import { CreateOrganizationSchema } from "#/types";
import { toDateOnly } from "#/utils/dates";
import { generateSlug, resolveUniqueSlug } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";

export const createOrganization = Workflow.name("org.create")
  .input(CreateOrganizationSchema)
  .handler(async (input, ctx) => {
    const slug = await resolveUniqueSlug(ctx.db, input.slug ?? generateSlug(input.name));

    const [org] = await ctx.db
      .insert(organization)
      .values({
        accentColor: input.accentColor,
        address: input.address ?? null,
        email: input.email ?? null,
        foundedDate: input.foundedDate ? toDateOnly(input.foundedDate) : null,
        industry: input.industry ?? null,
        locale: input.locale ?? "en-US",
        metadata: input.metadata ?? null,
        name: input.name,
        phone: input.phone ?? null,
        registrationNumber: input.registrationNumber ?? null,
        slug,
        taxId: input.taxId ?? null,
        timezone: input.timezone ?? "UTC",
        website: input.website ?? null,
      })
      .returning();

    if (!org) {
      throw new Error("Failed to create organization.");
    }

    await ctx.pubsub.publish(ORGANIZATION_EVENTS.CREATED, {
      organization: { id: org.id, name: org.name, slug: org.slug },
    });

    return org;
  });

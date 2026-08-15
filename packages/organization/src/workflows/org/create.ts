import { organization } from "#/db-schemas";
import { CreateOrganizationSchema, SlugSchema } from "#/types";
import { generateSlug } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { parse } from "valibot";

export const createOrganization = Workflow.name("org.create")
  .input(CreateOrganizationSchema)
  .handler(async (input, ctx) => {
    const slug = input.slug ?? generateSlug(input.name);
    parse(SlugSchema, slug);

    const [existing] = await ctx.db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);

    if (existing) {
      throw new Error(`Organization with slug "${slug}" already exists.`);
    }

    const [org] = await ctx.db
      .insert(organization)
      .values({
        accentColor: input.accentColor,
        address: input.address ?? null,
        email: input.email ?? null,
        foundedDate: input.foundedDate?.toISOString().split("T")[0] ?? null,
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

    return org;
  });

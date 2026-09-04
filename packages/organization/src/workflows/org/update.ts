import { ORGANIZATION_EVENTS } from "#/pubsub";
import { UpdateOrganizationSchema } from "#/types";
import { toDateOnly } from "#/utils/dates";
import { applyOrganizationUpdate, requireCurrentOrganization } from "#/workflows/org/utils";
import { collectChanges, ensureSlugAvailable } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";

export const updateOrganization = Workflow.name("org.update")
  .input(UpdateOrganizationSchema)
  .handler(async (input, ctx) => {
    const current = await requireCurrentOrganization(ctx.step);

    if (input.slug !== undefined && input.slug !== current.slug) {
      await ensureSlugAvailable(ctx.db, input.slug, current.id);
    }

    const values = {
      accentColor: input.accentColor,
      address: input.address,
      email: input.email,
      foundedDate: input.foundedDate ? toDateOnly(input.foundedDate) : undefined,
      industry: input.industry,
      locale: input.locale,
      logo: input.logo,
      metadata: input.metadata,
      name: input.name,
      phone: input.phone,
      registrationNumber: input.registrationNumber,
      slug: input.slug,
      status: input.status,
      taxId: input.taxId,
      timezone: input.timezone,
      website: input.website,
    };

    if (Object.values(values).every((value) => value === undefined)) {
      return current;
    }

    const updated = await applyOrganizationUpdate(ctx, values);

    await ctx.pubsub.publish(ORGANIZATION_EVENTS.UPDATED, {
      changes: collectChanges(values),
      organization: { id: updated.id, name: updated.name, slug: updated.slug },
    });

    return updated;
  });

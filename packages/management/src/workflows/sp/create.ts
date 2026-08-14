import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { serviceProvider } from "../../db-schemas";
import { SERVICE_PROVIDER_EVENTS } from "../../pubsub";
import { CreateServiceProviderSchema } from "../../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../../utils/constants";

const CreateInputSchema = object({
  input: CreateServiceProviderSchema,
});

export const createSp = Workflow.name("sp.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [result] = await ctx.db
      .insert(serviceProvider)
      .values({
        address: input.address ?? null,
        description: input.description ?? null,
        email: input.email ?? null,
        logo: input.logo ?? null,
        name: input.name,
        phone: input.phone ?? null,
        slug: input.slug,
        website: input.website ?? null,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create service provider.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.SP_CREATED,
      crudAction: "create",
      entityId: result.id,
      entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
      newState: { name: result.name, slug: result.slug, status: result.status },
    });

    await ctx.pubsub.publish(SERVICE_PROVIDER_EVENTS.CREATED, {
      serviceProvider: {
        id: result.id,
        name: result.name,
        slug: result.slug,
      },
    });

    return result;
  });

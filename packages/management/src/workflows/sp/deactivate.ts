import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { serviceProvider } from "../../db-schemas";
import { SERVICE_PROVIDER_EVENTS } from "../../pubsub";
import { IdSchema } from "../../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, SP_STATUS } from "../../utils/constants";
import { fetchServiceProviderStep } from "../../workflow-steps/fetch-sp";

export const deactivateSp = Workflow.name("sp.deactivate")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const { id } = input;

    const previous = await ctx.step.run(fetchServiceProviderStep, { id });

    const [updated] = await ctx.db
      .update(serviceProvider)
      .set({ status: SP_STATUS.INACTIVE, updatedAt: new Date() })
      .where(eq(serviceProvider.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Service Provider with id "${id}" not found.`);
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.SP_DEACTIVATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
      newState: { status: SP_STATUS.INACTIVE },
      previousState: previous as Record<string, unknown>,
    });

    await ctx.pubsub.publish(SERVICE_PROVIDER_EVENTS.DEACTIVATED, {
      serviceProviderId: id,
    });

    return updated;
  });

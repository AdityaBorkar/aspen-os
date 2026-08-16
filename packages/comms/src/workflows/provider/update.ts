import { commsProvider } from "#/db-schemas";
import { UpdateProviderSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchProviderStep } from "#/workflow-steps/fetch-provider";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ input: UpdateProviderSchema });

export const updateProvider = Workflow.name("comms.provider.update")
  .input(UpdateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UpdateProviderSchema, input);
    const current = await ctx.step.run(fetchProviderStep, { id: parsed.id });

    const [updated] = await ctx.db
      .update(commsProvider)
      .set({
        defaultSenderAddress: parsed.defaultSenderAddress ?? current.defaultSenderAddress,
        metadata: parsed.metadata ?? current.metadata,
        name: parsed.name ?? current.name,
        updatedAt: new Date(),
      })
      .where(eq(commsProvider.id, parsed.id))
      .returning();

    if (!updated) {
      throw new Error(`Provider with id "${parsed.id}" not found.`);
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.PROVIDER,
      newState: {
        defaultSenderAddress: updated.defaultSenderAddress,
        kind: updated.kind,
        name: updated.name,
      },
    });

    return updated;
  });

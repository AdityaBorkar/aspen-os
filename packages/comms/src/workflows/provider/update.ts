import { commsProvider } from "#/db-schemas";
import { UpdateProviderSchema } from "#/schemas/provider";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { metadataEqual } from "#/utils/metadata";
import { auditAndPublish } from "#/workflow-steps/audit";
import { fetchProviderStep } from "#/workflow-steps/fetch-provider";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({ input: UpdateProviderSchema });

export const updateProvider = Workflow.name("comms.provider.update")
  .input(UpdateInputSchema)
  .handler(async ({ input }, ctx) => {
    const current = await ctx.step.run(fetchProviderStep, { id: input.id });

    const changes: Record<string, JsonValue> = {};
    if (input.name !== undefined && input.name !== current.name) {
      changes.name = input.name;
    }
    if (
      input.defaultSenderAddress !== undefined &&
      input.defaultSenderAddress !== current.defaultSenderAddress
    ) {
      changes.defaultSenderAddress = input.defaultSenderAddress;
    }
    if (input.metadata !== undefined && !metadataEqual(input.metadata, current.metadata)) {
      changes.metadata = input.metadata ?? null;
    }

    if (Object.keys(changes).length === 0) {
      return current;
    }

    const [updated] = await ctx.db
      .update(commsProvider)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(commsProvider.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Provider with id "${input.id}" not found.`);
    }

    await auditAndPublish(ctx, {
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

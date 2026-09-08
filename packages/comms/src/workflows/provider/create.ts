import { commsProvider } from "#/db-schemas";
import { PROVIDER_EVENTS } from "#/pubsub";
import { CreateProviderSchema } from "#/schemas/provider";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";

import type { KvStoreUnit } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateProviderSchema });

export function createProvider(kvStore: KvStoreUnit) {
  return Workflow.name("comms.provider.create")
    .input(CreateInputSchema)
    .handler(async ({ input }, ctx) => {
      const credentialRef = `comms:provider:${crypto.randomUUID()}:credential`;
      await ctx.step.run("store-credential", () => kvStore.set(credentialRef, input.credential, 0));

      const [row] = await ctx.db
        .insert(commsProvider)
        .values({
          credential_ref: credentialRef,
          default_sender_address: input.defaultSenderAddress ?? null,
          kind: input.kind,
          metadata: input.metadata ?? null,
          name: input.name,
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create provider.");
      }

      await auditAndPublish(ctx, {
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PROVIDER,
        event: {
          payload: {
            provider: { id: row.id, kind: row.kind, name: row.name },
          },
          topic: PROVIDER_EVENTS.CREATED,
        },
        newState: { kind: row.kind, name: row.name },
      });

      return row;
    });
}

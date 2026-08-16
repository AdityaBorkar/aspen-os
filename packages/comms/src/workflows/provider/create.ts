import { commsProvider } from "#/db-schemas";
import { PROVIDER_EVENTS } from "#/pubsub";
import { CreateProviderSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { KvStoreUnit } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateProviderSchema });

export function createProvider(kvStore: KvStoreUnit) {
  return Workflow.name("comms.provider.create")
    .input(CreateInputSchema)
    .handler(async ({ input }, ctx) => {
      const parsed = parse(CreateProviderSchema, input);

      const credentialRef = `comms:provider:${crypto.randomUUID()}:credential`;
      await ctx.step.run("store-credential", () =>
        kvStore.set(credentialRef, parsed.credential, 0),
      );

      const [row] = await ctx.db
        .insert(commsProvider)
        .values({
          credentialRef,
          defaultSenderAddress: parsed.defaultSenderAddress ?? null,
          kind: parsed.kind,
          metadata: parsed.metadata ?? null,
          name: parsed.name,
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create provider.");
      }

      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.CREATED,
          crudAction: "create",
          entityId: row.id,
          entityType: AUDIT_ENTITY_TYPE.PROVIDER,
          newState: {
            kind: row.kind,
            name: row.name,
          },
        });

        await ctx.pubsub.publish(PROVIDER_EVENTS.CREATED, {
          provider: {
            id: row.id,
            kind: row.kind,
            name: row.name,
          },
        });
      });

      return row;
    });
}

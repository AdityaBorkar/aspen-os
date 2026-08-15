import { masterConnection } from "#/db-schemas";
import { CONNECTION_EVENTS } from "#/pubsub";
import { CreateConnectionSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { KvStoreUnit } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateConnectionSchema });

export function createConnection(kvStore: KvStoreUnit) {
  return Workflow.name("masters.connection.create")
    .input(CreateInputSchema)
    .handler(async ({ input }, ctx) => {
      const parsed = parse(CreateConnectionSchema, input);

      const credentialRef = `masters:connection:${crypto.randomUUID()}:credential`;
      await ctx.step.run("store-credential", () =>
        kvStore.set(credentialRef, parsed.credential, 0),
      );

      const [connectionRow] = await ctx.db
        .insert(masterConnection)
        .values({
          baseUrl: parsed.baseUrl ?? null,
          credentialRef,
          description: parsed.description ?? null,
          entityId: parsed.entityId,
          entityType: parsed.entityType,
          metadata: parsed.metadata ?? null,
          name: parsed.name,
          status: parsed.status,
          type: parsed.type,
        })
        .returning();

      if (!connectionRow) {
        throw new Error("Failed to create connection.");
      }

      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.CREATED,
          crudAction: "create",
          entityId: connectionRow.id,
          entityType: AUDIT_ENTITY_TYPE.CONNECTION,
          newState: {
            baseUrl: connectionRow.baseUrl,
            entityId: connectionRow.entityId,
            entityType: connectionRow.entityType,
            name: connectionRow.name,
            status: connectionRow.status,
            type: connectionRow.type,
          },
        });

        await ctx.pubsub.publish(CONNECTION_EVENTS.CREATED, {
          connection: {
            id: connectionRow.id,
            name: connectionRow.name,
            type: connectionRow.type,
          },
          entityId: connectionRow.entityId,
          entityType: connectionRow.entityType,
        });
      });

      return connectionRow;
    });
}

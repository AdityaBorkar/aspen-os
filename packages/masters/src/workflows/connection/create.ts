import { masterConnection } from "#/db-schemas";
import { CONNECTION_EVENTS } from "#/pubsub";
import { buildCredentialRef, CREDENTIAL_NO_EXPIRY } from "#/services/connection-service";
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

      const credentialRef = buildCredentialRef();
      await ctx.step.run("store-credential", () =>
        kvStore.set(credentialRef, parsed.credential, CREDENTIAL_NO_EXPIRY),
      );

      let connectionRow: typeof masterConnection.$inferSelect | undefined = undefined;
      try {
        [connectionRow] = await ctx.db
          .insert(masterConnection)
          .values({
            base_url: parsed.baseUrl ?? null,
            credential_ref: credentialRef,
            description: parsed.description ?? null,
            entity_id: parsed.entityId,
            entity_type: parsed.entityType,
            metadata: parsed.metadata ?? null,
            name: parsed.name,
            status: parsed.status,
            type: parsed.type,
          })
          .returning();
      } catch (error) {
        await ctx.step.run("delete-orphaned-credential", () => kvStore.del(credentialRef));
        throw error;
      }

      if (!connectionRow) {
        await ctx.step.run("delete-orphaned-credential", () => kvStore.del(credentialRef));
        throw new Error("Failed to create connection.");
      }

      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.CREATED,
          crudAction: "create",
          entityId: connectionRow.id,
          entityType: AUDIT_ENTITY_TYPE.CONNECTION,
          newState: {
            baseUrl: connectionRow.base_url,
            entityId: connectionRow.entity_id,
            entityType: connectionRow.entity_type,
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
          entityId: connectionRow.entity_id,
          entityType: connectionRow.entity_type,
        });
      });

      return connectionRow;
    });
}

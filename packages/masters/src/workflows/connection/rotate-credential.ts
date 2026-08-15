import { masterConnection } from "#/db-schemas";
import { CONNECTION_EVENTS } from "#/pubsub";
import { RotateConnectionCredentialSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchConnectionStep } from "#/workflow-steps/fetch-connection";

import type { KvStoreUnit } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export function rotateConnectionCredential(kvStore: KvStoreUnit) {
  return Workflow.name("masters.connection.rotate-credential")
    .input(RotateConnectionCredentialSchema)
    .handler(async (input, ctx) => {
      const current = await ctx.step.run(fetchConnectionStep, { id: input.id });

      const newRef = `masters:connection:${crypto.randomUUID()}:credential`;
      await ctx.step.run("store-credential", () => kvStore.set(newRef, input.credential, 0));
      if (current.credentialRef) {
        await ctx.step.run("delete-old-credential", () => kvStore.del(current.credentialRef));
      }

      const [updated] = await ctx.db
        .update(masterConnection)
        .set({ credentialRef: newRef, updatedAt: new Date() })
        .where(eq(masterConnection.id, input.id))
        .returning();

      if (!updated) {
        throw new Error(`Connection with id "${input.id}" not found.`);
      }

      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.CREDENTIAL_ROTATED,
          entityId: updated.id,
          entityType: AUDIT_ENTITY_TYPE.CONNECTION,
        });

        await ctx.pubsub.publish(CONNECTION_EVENTS.CREDENTIAL_ROTATED, {
          connectionId: updated.id,
        });
      });

      return updated;
    });
}

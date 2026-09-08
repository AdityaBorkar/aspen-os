import { masterConnection } from "#/db-schemas";
import { CONNECTION_EVENTS } from "#/pubsub";
import { buildCredentialRef, CREDENTIAL_NO_EXPIRY } from "#/services/connection-service";
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

      const newRef = buildCredentialRef();
      await ctx.step.run("store-credential", () =>
        kvStore.set(newRef, input.credential, CREDENTIAL_NO_EXPIRY),
      );

      let updated: typeof masterConnection.$inferSelect | undefined = undefined;
      try {
        [updated] = await ctx.db
          .update(masterConnection)
          .set({ credential_ref: newRef, updated_at: new Date() })
          .where(eq(masterConnection.id, input.id))
          .returning();
      } catch (error) {
        await ctx.step.run("delete-orphaned-credential", () => kvStore.del(newRef));
        throw error;
      }

      if (!updated) {
        await ctx.step.run("delete-orphaned-credential", () => kvStore.del(newRef));
        throw new Error(`Connection with id "${input.id}" not found.`);
      }

      if (current.credential_ref) {
        await ctx.step.run("delete-old-credential", () => kvStore.del(current.credential_ref));
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

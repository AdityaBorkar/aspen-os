import { masterConnection } from "#/db-schemas";
import { CONNECTION_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchConnectionStep } from "#/workflow-steps/fetch-connection";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const activateConnection = Workflow.name("masters.connection.activate")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchConnectionStep, { id: input.id });

    if (current.status === "active") {
      return current;
    }

    const [updated] = await ctx.db
      .update(masterConnection)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(masterConnection.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Connection with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ACTIVATED,
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CONNECTION,
      });

      await ctx.pubsub.publish(CONNECTION_EVENTS.STATUS_CHANGED, {
        connectionId: updated.id,
        fromStatus: current.status,
        toStatus: "active",
      });
    });

    return updated;
  });

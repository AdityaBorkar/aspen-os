import { masterConnection } from "#/db-schemas";
import { CONNECTION_EVENTS } from "#/pubsub";
import { UpdateConnectionSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchConnectionStep } from "#/workflow-steps/fetch-connection";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateConnectionSchema,
});

export const updateConnection = Workflow.name("masters.connection.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchConnectionStep, { id: input.id });

    const [updated] = await ctx.db
      .update(masterConnection)
      .set({
        baseUrl: input.patch.baseUrl,
        description: input.patch.description,
        metadata: input.patch.metadata,
        name: input.patch.name,
        status: input.patch.status,
        type: input.patch.type,
        updatedAt: new Date(),
      })
      .where(eq(masterConnection.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Connection with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: input.patch,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CONNECTION,
      });

      if (input.patch.status !== undefined && input.patch.status !== current.status) {
        await ctx.pubsub.publish(CONNECTION_EVENTS.STATUS_CHANGED, {
          connectionId: updated.id,
          fromStatus: current.status,
          toStatus: input.patch.status,
        });
      }

      await ctx.pubsub.publish(CONNECTION_EVENTS.UPDATED, {
        changes: input.patch,
        connection: { id: updated.id, name: updated.name },
      });
    });

    return updated;
  });

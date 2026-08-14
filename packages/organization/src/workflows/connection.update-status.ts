import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { connection } from "../db-schemas";
import { CONNECTION_EVENTS } from "../pubsub";
import { type ConnectionStatus, ConnectionStatusSchema } from "../types";
import { fetchConnectionStep } from "../workflow-steps/fetch-connection";

export const updateStatus = Workflow.name("connection.update-status")
  .input(
    object({
      id: string(),
      status: ConnectionStatusSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchConnectionStep, { id: input.id });
    const fromStatus = current.status;

    const [updated] = await ctx.db
      .update(connection)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(connection.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Connection with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(CONNECTION_EVENTS.STATUS_CHANGED, {
      connectionId: input.id,
      fromStatus: fromStatus as ConnectionStatus,
      toStatus: input.status,
    });

    return { connection: updated, fromStatus, toStatus: input.status };
  });

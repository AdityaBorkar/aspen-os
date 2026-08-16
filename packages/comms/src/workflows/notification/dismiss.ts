import { commsNotification } from "#/db-schemas";
import { NOTIFICATION_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchNotificationStep } from "#/workflow-steps/fetch-notification";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const DismissInputSchema = object({ input: object({ id: IdSchema }) });

export const dismiss = Workflow.name("comms.notification.dismiss")
  .input(DismissInputSchema)
  .handler(async ({ input }, ctx) => {
    const current = await ctx.step.run(fetchNotificationStep, { id: input.id });
    if (current.status === "dismissed") {
      return current;
    }

    const at = new Date();
    const [updated] = await ctx.db
      .update(commsNotification)
      .set({ status: "dismissed", updatedAt: at })
      .where(eq(commsNotification.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Notification with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DISMISSED,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.NOTIFICATION,
      });

      await ctx.pubsub.publish(NOTIFICATION_EVENTS.DISMISSED, {
        at: at.toISOString(),
        notificationId: updated.id,
        userId: updated.recipientId,
      });
    });

    return updated;
  });

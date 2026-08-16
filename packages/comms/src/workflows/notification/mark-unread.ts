import { commsNotification } from "#/db-schemas";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchNotificationStep } from "#/workflow-steps/fetch-notification";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const MarkUnreadInputSchema = object({ input: object({ id: IdSchema }) });

export const markUnread = Workflow.name("comms.notification.mark-unread")
  .input(MarkUnreadInputSchema)
  .handler(async ({ input }, ctx) => {
    const current = await ctx.step.run(fetchNotificationStep, { id: input.id });
    if (current.status === "unread") {
      return current;
    }

    const [updated] = await ctx.db
      .update(commsNotification)
      .set({ readAt: null, status: "unread", updatedAt: new Date() })
      .where(eq(commsNotification.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Notification with id "${input.id}" not found.`);
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.MARKED_UNREAD,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.NOTIFICATION,
    });

    return updated;
  });

import { calendarReminder } from "#/db-schemas";
import { REMINDER_EVENTS } from "#/pubsub";
import { assertCanAccessReminder } from "#/services/access-service";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchReminderStep } from "#/workflow-steps/fetch-reminder";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const deleteReminder = Workflow.name("calendar.reminder.delete")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const existing = await ctx.step.run(fetchReminderStep, { id });

    await assertCanAccessReminder(existing, ctx.actorId, ctx.db);

    await ctx.db.delete(calendarReminder).where(eq(calendarReminder.id, id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: existing.id,
        entityType: AUDIT_ENTITY_TYPE.REMINDER,
        previousState: { remindAt: existing.remindAt, type: existing.type },
      });

      await ctx.pubsub.publish(REMINDER_EVENTS.DELETED, {
        reminderId: existing.id,
      });
    });

    return { removed: true };
  });

import { calendar, calendarAttendee, calendarEvent, calendarReminder } from "#/db-schemas";
import { CALENDAR_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, REMINDER_TARGET } from "#/utils/constants";
import { assertCanMutate } from "#/workflow-steps/access-service";
import { fetchCalendarStep } from "#/workflow-steps/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";

export const deleteCalendar = Workflow.name("calendar.calendar.delete")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const existing = await ctx.step.run(fetchCalendarStep, { id });

    await assertCanMutate(existing, ctx.actorId, ctx.db);

    await ctx.db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: calendarEvent.id })
        .from(calendarEvent)
        .where(eq(calendarEvent.calendar_id, id));

      const eventIds = rows.map((row) => row.id);

      if (eventIds.length > 0) {
        await tx
          .delete(calendarReminder)
          .where(
            and(
              eq(calendarReminder.target_type, REMINDER_TARGET.EVENT),
              inArray(calendarReminder.target_id, eventIds),
            ),
          );
        await tx.delete(calendarAttendee).where(inArray(calendarAttendee.event_id, eventIds));
      }

      await tx.delete(calendarEvent).where(eq(calendarEvent.calendar_id, id));
      await tx.delete(calendar).where(eq(calendar.id, id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: existing.id,
        entityType: AUDIT_ENTITY_TYPE.CALENDAR,
        previousState: { name: existing.name },
      });

      await ctx.pubsub.publish(CALENDAR_EVENTS.DELETED, {
        calendarId: existing.id,
      });
    });

    return { removed: true };
  });

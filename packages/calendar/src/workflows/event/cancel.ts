import { calendarEvent } from "#/db-schemas";
import { EVENT_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, EVENT_STATUS } from "#/utils/constants";
import { assertCanMutate } from "#/workflow-steps/access-service";
import { fetchEventCalendarStep, fetchEventStep } from "#/workflow-steps/fetch";
import { toEventPayload } from "#/workflow-steps/payloads";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const cancelEvent = Workflow.name("calendar.event.cancel")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const event = await ctx.step.run(fetchEventStep, { id });
    const cal = await ctx.step.run(fetchEventCalendarStep, { eventId: event.id });

    await assertCanMutate(cal, ctx.actorId, ctx.db);

    if (event.status === EVENT_STATUS.CANCELLED) {
      throw new Error("Event is already cancelled.");
    }

    const [updated] = await ctx.db
      .update(calendarEvent)
      .set({ status: EVENT_STATUS.CANCELLED })
      .where(eq(calendarEvent.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Event with id "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CANCELLED,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.EVENT,
        newState: { status: updated.status },
        previousState: { status: event.status },
      });

      await ctx.pubsub.publish(EVENT_EVENTS.CANCELLED, {
        calendarId: updated.calendarId,
        event: toEventPayload(updated),
      });
    });

    return updated;
  });

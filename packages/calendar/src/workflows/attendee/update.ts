import { calendarAttendee } from "#/db-schemas";
import { ATTENDEE_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { IdSchema, UpdateAttendeeSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchAttendeeStep } from "#/workflow-steps/fetch-attendee";
import { fetchEventCalendarStep } from "#/workflow-steps/fetch-event-calendar";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ id: IdSchema, input: UpdateAttendeeSchema });

export const updateAttendee = Workflow.name("calendar.attendee.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdateAttendeeSchema, input);

    const existing = await ctx.step.run(fetchAttendeeStep, { id });
    const cal = await ctx.step.run(fetchEventCalendarStep, { eventId: existing.eventId });

    await assertCanMutate(cal, ctx.actorId);

    const updates = stripUndefined({
      attendeeId: parsed.attendeeId,
      attendeeType: parsed.attendeeType,
      email: parsed.email,
      name: parsed.name,
      optional: parsed.optional,
      status: parsed.status,
    });

    const [updated] = await ctx.db
      .update(calendarAttendee)
      .set({ ...updates })
      .where(eq(calendarAttendee.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Attendee with id "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: parsed,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.ATTENDEE,
        newState: { email: updated.email, status: updated.status },
        previousState: { email: existing.email, status: existing.status },
      });

      await ctx.pubsub.publish(ATTENDEE_EVENTS.UPDATED, {
        attendee: {
          email: updated.email,
          id: updated.id,
          name: updated.name,
          status: updated.status,
        },
        calendarId: cal.id,
        eventId: updated.eventId,
      });
    });

    return updated;
  });

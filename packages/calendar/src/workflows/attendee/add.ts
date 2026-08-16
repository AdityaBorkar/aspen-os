import { calendarAttendee } from "#/db-schemas";
import { ATTENDEE_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { CreateAttendeeSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEventCalendarStep } from "#/workflow-steps/fetch-event-calendar";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateAttendeeSchema });

export const addAttendee = Workflow.name("calendar.attendee.add")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateAttendeeSchema, input);

    const cal = await ctx.step.run(fetchEventCalendarStep, { eventId: parsed.eventId });
    await assertCanMutate(cal, ctx.actorId);

    const [created] = await ctx.db
      .insert(calendarAttendee)
      .values({
        attendeeId: parsed.attendeeId ?? null,
        attendeeType: parsed.attendeeType,
        email: parsed.email,
        eventId: parsed.eventId,
        name: parsed.name ?? null,
        optional: parsed.optional ?? false,
        status: parsed.status,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to add attendee.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.INVITED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.ATTENDEE,
        newState: { email: created.email, eventId: created.eventId, status: created.status },
      });

      await ctx.pubsub.publish(ATTENDEE_EVENTS.INVITED, {
        attendee: {
          email: created.email,
          id: created.id,
          name: created.name,
          status: created.status,
        },
        calendarId: cal.id,
        eventId: created.eventId,
      });
    });

    return created;
  });

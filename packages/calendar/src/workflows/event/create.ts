import { calendarEvent } from "#/db-schemas";
import { EVENT_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { validateEventWindow, validateSourceLink } from "#/services/event-service";
import { CreateEventSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchCalendarStep } from "#/workflow-steps/fetch-calendar";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateEventSchema });

export const createEvent = Workflow.name("calendar.event.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateEventSchema, input);

    const cal = await ctx.step.run(fetchCalendarStep, { id: parsed.calendarId });
    await assertCanMutate(cal, ctx.actorId);

    validateEventWindow(parsed);
    validateSourceLink(parsed.sourceType, parsed.sourceEntityId);

    const [created] = await ctx.db
      .insert(calendarEvent)
      .values({
        allDay: parsed.allDay ?? false,
        calendarId: parsed.calendarId,
        color: parsed.color ?? null,
        createdBy: ctx.actorId ?? "system",
        description: parsed.description ?? null,
        endsAt: parsed.endsAt ?? null,
        location: parsed.location ?? null,
        recurrence: parsed.recurrence ?? null,
        sourceEntityId: parsed.sourceEntityId ?? null,
        sourceType: parsed.sourceType ?? null,
        startsAt: parsed.startsAt,
        status: parsed.status,
        timezone: parsed.timezone ?? null,
        title: parsed.title,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create event.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.EVENT,
        newState: {
          calendarId: created.calendarId,
          startsAt: created.startsAt,
          title: created.title,
        },
      });

      await ctx.pubsub.publish(EVENT_EVENTS.CREATED, {
        calendarId: created.calendarId,
        event: {
          calendarId: created.calendarId,
          endsAt: created.endsAt?.toISOString() ?? null,
          id: created.id,
          startsAt: created.startsAt.toISOString(),
          title: created.title,
        },
        sourceEntityId: created.sourceEntityId,
        sourceType: created.sourceType,
      });
    });

    return created;
  });

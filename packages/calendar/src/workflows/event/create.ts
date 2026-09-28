import { calendarEvent } from "#/db-schemas";
import { EVENT_EVENTS } from "#/pubsub";
import { CreateEventSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, CALENDAR_AUDIENCE } from "#/utils/constants";
import { validateEventWindow, validateSourceLink } from "#/workflow-steps/event-service";
import { toEventPayload } from "#/workflow-steps/payloads";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateEventSchema });

export const createEvent = Workflow.name("calendar.event.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateEventSchema, input);

    if (
      parsed.audienceType !== CALENDAR_AUDIENCE.ORGANIZATION &&
      (parsed.audienceId === undefined || parsed.audienceId === null || parsed.audienceId === "")
    ) {
      throw new Error("audienceId is required for group or user audiences");
    }

    validateEventWindow(parsed);
    validateSourceLink(parsed.sourceType, parsed.sourceEntityId);

    const [created] = await ctx.db
      .insert(calendarEvent)
      .values({
        all_day: parsed.allDay ?? false,
        audience_id: parsed.audienceType === "organization" ? null : (parsed.audienceId ?? null),
        audience_type: parsed.audienceType,
        color: parsed.color ?? null,
        created_by: ctx.actorId ?? "system",
        description: parsed.description ?? null,
        ends_at: parsed.endsAt ?? null,
        location: parsed.location ?? null,
        recurrence: parsed.recurrence ?? null,
        source_entity_id: parsed.sourceEntityId ?? null,
        source_type: parsed.sourceType ?? null,
        starts_at: parsed.startsAt,
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
          audienceType: created.audience_type,
          startsAt: created.starts_at,
          title: created.title,
        },
      });

      await ctx.pubsub.publish(EVENT_EVENTS.CREATED, {
        event: toEventPayload(created),
        sourceEntityId: created.source_entity_id,
        sourceType: created.source_type,
      });
    });

    return created;
  });

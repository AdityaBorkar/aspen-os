import { IdSchema, OccurrencesQuerySchema } from "#/types";
import { assertCanAccess } from "#/workflow-steps/access-service";
import { fetchEventStep } from "#/workflow-steps/fetch-event";
import { fetchEventCalendarStep } from "#/workflow-steps/fetch-event-calendar";
import { expandOccurrences } from "#/workflow-steps/recurrence";

import { Workflow } from "@aspen-os/platform/server";
import { object, optional, parse } from "valibot";

const InputSchema = object({ id: IdSchema, query: optional(OccurrencesQuerySchema) });

export const getEventOccurrences = Workflow.name("calendar.event.get-occurrences")
  .input(InputSchema)
  .handler(async ({ id, query }, ctx) => {
    const parsed = parse(OccurrencesQuerySchema, query ?? {});

    const event = await ctx.step.run(fetchEventStep, { id });
    const cal = await ctx.step.run(fetchEventCalendarStep, { eventId: event.id });

    assertCanAccess(cal, ctx.actorId);

    const from = parsed.from ?? new Date(0);
    const to = parsed.to ?? new Date("9999-12-31T23:59:59.999Z");

    return expandOccurrences(event, from, to, parsed.limit ?? 100);
  });

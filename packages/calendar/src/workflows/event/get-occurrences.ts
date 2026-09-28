import { IdSchema, OccurrencesQuerySchema } from "#/types";
import { assertCanAccessEvent } from "#/workflow-steps/access-service";
import { fetchEventStep } from "#/workflow-steps/fetch";
import { expandOccurrences, resolveOccurrenceRange } from "#/workflow-steps/recurrence";

import { Workflow } from "@aspen-os/platform/server";
import { object, optional, parse } from "valibot";

const InputSchema = object({ id: IdSchema, query: optional(OccurrencesQuerySchema) });

export const getEventOccurrences = Workflow.name("calendar.event.get-occurrences")
  .input(InputSchema)
  .handler(async ({ id, query }, ctx) => {
    const parsed = parse(OccurrencesQuerySchema, query ?? {});

    const event = await ctx.step.run(fetchEventStep, { id });

    await assertCanAccessEvent(event, ctx.actorId, ctx.db);

    return expandOccurrences(event, resolveOccurrenceRange(parsed));
  });

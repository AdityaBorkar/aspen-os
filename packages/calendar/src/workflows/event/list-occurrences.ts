import { EventFiltersSchema, OccurrencesQuerySchema } from "#/types";
import { resolveActorId } from "#/workflow-steps/access-service";
import { queryEvents } from "#/workflow-steps/event-service";
import { expandOccurrences, resolveOccurrenceRange } from "#/workflow-steps/recurrence";

import { Workflow } from "@aspen-os/platform/server";
import { object, optional, parse } from "valibot";

const InputSchema = object({
  filters: optional(EventFiltersSchema),
  query: optional(OccurrencesQuerySchema),
});

export const listEventOccurrences = Workflow.name("calendar.event.list-occurrences")
  .input(InputSchema)
  .handler(async ({ filters, query }, ctx) => {
    const parsedFilters = parse(EventFiltersSchema, filters ?? {});
    const parsedQuery = parse(OccurrencesQuerySchema, query ?? {});

    const events = await queryEvents(ctx.db, resolveActorId(ctx.actorId), parsedFilters);
    const range = resolveOccurrenceRange(parsedQuery);

    return events.flatMap((event) => expandOccurrences(event, range));
  });

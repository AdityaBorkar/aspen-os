import { queryEvents } from "#/services/event-service";
import { expandOccurrences } from "#/services/recurrence";
import { EventFiltersSchema, OccurrencesQuerySchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object, optional, parse } from "valibot";

const InputSchema = object({
  filters: optional(EventFiltersSchema),
  query: optional(OccurrencesQuerySchema),
});

export const listEventOccurrences = Workflow.name("calendar.event.list-occurrences")
  .input(InputSchema)
  .handler(async ({ filters, query }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const parsedFilters = parse(EventFiltersSchema, filters ?? {});
    const parsedQuery = parse(OccurrencesQuerySchema, query ?? {});

    const events = await queryEvents(ctx.db, ctx.actorId, parsedFilters);

    const from = parsedQuery.from ?? new Date(0);
    const to = parsedQuery.to ?? new Date("9999-12-31T23:59:59.999Z");

    return events.flatMap((event) => expandOccurrences(event, from, to, parsedQuery.limit ?? 100));
  });

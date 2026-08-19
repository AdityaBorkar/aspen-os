import { EventFiltersSchema } from "#/types";
import { queryEvents } from "#/workflow-steps/event-service";

import { Workflow } from "@aspen-os/platform/server";
import { object, optional, parse } from "valibot";

const ListInputSchema = object({ filters: optional(EventFiltersSchema) });

export const listEvents = Workflow.name("calendar.event.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const parsed = parse(EventFiltersSchema, filters ?? {});

    return queryEvents(ctx.db, ctx.actorId, parsed);
  });

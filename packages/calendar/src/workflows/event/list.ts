import { EventFiltersSchema } from "#/types";
import { resolveActorId } from "#/workflow-steps/access-service";
import { queryEvents } from "#/workflow-steps/event-service";

import { Workflow } from "@aspen-os/platform/server";
import { object, optional, parse } from "valibot";

const ListInputSchema = object({ filters: optional(EventFiltersSchema) });

export const listEvents = Workflow.name("calendar.event.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(EventFiltersSchema, filters ?? {});

    return queryEvents(ctx.db, resolveActorId(ctx.actorId), parsed);
  });

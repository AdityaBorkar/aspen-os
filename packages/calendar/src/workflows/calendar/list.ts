import { calendar } from "#/db-schemas";
import { CalendarFiltersSchema } from "#/types";
import { escapeLikePattern, visibleCalendarCondition } from "#/workflow-steps/access-scope";
import { resolveActorId } from "#/workflow-steps/access-service";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, ilike } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const ListInputSchema = object({ filters: optional(CalendarFiltersSchema) });

export const listCalendars = Workflow.name("calendar.calendar.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    const actorId = resolveActorId(ctx.actorId);
    const parsed = parse(CalendarFiltersSchema, filters ?? {});

    const conditions = [visibleCalendarCondition(actorId)];

    if (parsed.access) {
      conditions.push(eq(calendar.access, parsed.access));
    }
    if (parsed.isDefault !== undefined) {
      conditions.push(eq(calendar.isDefault, parsed.isDefault));
    }
    if (parsed.search) {
      conditions.push(ilike(calendar.name, `%${escapeLikePattern(parsed.search)}%`));
    }

    return ctx.db
      .select()
      .from(calendar)
      .where(and(...conditions))
      .orderBy(asc(calendar.name))
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
  });

import { calendarReminder } from "#/db-schemas";
import { ReminderFiltersSchema } from "#/types";
import { REMINDER_TARGET } from "#/utils/constants";
import { accessibleEventIds } from "#/workflow-steps/access-scope";
import { resolveActorId } from "#/workflow-steps/access-service";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const ListInputSchema = object({ filters: optional(ReminderFiltersSchema) });

export const listReminders = Workflow.name("calendar.reminder.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    const actorId = resolveActorId(ctx.actorId);
    const parsed = parse(ReminderFiltersSchema, filters ?? {});

    const conditions = [
      or(
        eq(calendarReminder.userId, actorId),
        and(
          eq(calendarReminder.targetType, REMINDER_TARGET.EVENT),
          inArray(calendarReminder.targetId, accessibleEventIds(ctx.db, actorId)),
        ),
      ),
    ];

    if (parsed.targetType) {
      conditions.push(eq(calendarReminder.targetType, parsed.targetType));
    }
    if (parsed.targetId) {
      conditions.push(eq(calendarReminder.targetId, parsed.targetId));
    }
    if (parsed.type) {
      conditions.push(eq(calendarReminder.type, parsed.type));
    }
    if (parsed.userId) {
      conditions.push(eq(calendarReminder.userId, parsed.userId));
    }
    if (parsed.isSent !== undefined) {
      conditions.push(eq(calendarReminder.isSent, parsed.isSent));
    }

    return ctx.db
      .select()
      .from(calendarReminder)
      .where(and(...conditions))
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
  });

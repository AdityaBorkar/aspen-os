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
        eq(calendarReminder.user_id, actorId),
        and(
          eq(calendarReminder.target_type, REMINDER_TARGET.EVENT),
          inArray(calendarReminder.target_id, accessibleEventIds(ctx.db, actorId)),
        ),
      ),
    ];

    if (parsed.targetType) {
      conditions.push(eq(calendarReminder.target_type, parsed.targetType));
    }
    if (parsed.targetId) {
      conditions.push(eq(calendarReminder.target_id, parsed.targetId));
    }
    if (parsed.type) {
      conditions.push(eq(calendarReminder.type, parsed.type));
    }
    if (parsed.userId) {
      conditions.push(eq(calendarReminder.user_id, parsed.userId));
    }
    if (parsed.isSent !== undefined) {
      conditions.push(eq(calendarReminder.is_sent, parsed.isSent));
    }

    return ctx.db
      .select()
      .from(calendarReminder)
      .where(and(...conditions))
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
  });

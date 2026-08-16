import { calendarEvent, calendarReminder } from "#/db-schemas";
import { REMINDER_EVENTS } from "#/pubsub";
import { resolveActorId } from "#/services/access-service";
import { CreateReminderSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateReminderSchema });

const TARGET_REQUIRING_ID = new Set(["event", "task", "note", "file"]);

function validateReminderAnchor(input: {
  offsetMinutes: number | null | undefined;
  remindAt: Date | null | undefined;
  targetId: string | null | undefined;
  targetType: string;
  type: string;
}): void {
  if (input.type === "offset") {
    if (input.offsetMinutes === null || input.offsetMinutes === undefined) {
      throw new Error("offsetMinutes is required for offset reminders");
    }
    if (input.remindAt === undefined) {
      throw new Error("remindAt is required for offset reminders with no resolvable target anchor");
    }
    return;
  }
  if (!input.remindAt) {
    throw new Error("remindAt is required for this reminder type");
  }
}

export const createReminder = Workflow.name("calendar.reminder.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateReminderSchema, input);
    const actorId = resolveActorId(ctx.actorId);

    if (TARGET_REQUIRING_ID.has(parsed.targetType) && !parsed.targetId) {
      throw new Error(`targetId is required for targetType "${parsed.targetType}"`);
    }

    let { remindAt } = parsed;
    if (parsed.type === "offset") {
      if (parsed.targetType === "event" && parsed.targetId && remindAt === undefined) {
        const [event] = await ctx.db
          .select({ startsAt: calendarEvent.startsAt })
          .from(calendarEvent)
          .where(eq(calendarEvent.id, parsed.targetId))
          .limit(1);

        if (!event) {
          throw new Error(`Event with id "${parsed.targetId}" not found.`);
        }

        if (parsed.offsetMinutes !== null && parsed.offsetMinutes !== undefined) {
          remindAt = new Date(event.startsAt.getTime() - parsed.offsetMinutes * 60_000);
        }
      }
    }

    validateReminderAnchor({
      offsetMinutes: parsed.offsetMinutes,
      remindAt,
      targetId: parsed.targetId,
      targetType: parsed.targetType,
      type: parsed.type,
    });

    const [created] = await ctx.db
      .insert(calendarReminder)
      .values({
        channel: parsed.channel,
        createdBy: actorId,
        interval: parsed.interval ?? null,
        isRecurring: parsed.isRecurring ?? false,
        message: parsed.message ?? null,
        offsetMinutes: parsed.offsetMinutes ?? null,
        remindAt: remindAt ?? null,
        targetId: parsed.targetId ?? "",
        targetType: parsed.targetType,
        type: parsed.type,
        userId: parsed.userId,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create reminder.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.REMINDER,
        newState: { remindAt: created.remindAt, targetId: created.targetId, type: created.type },
      });

      await ctx.pubsub.publish(REMINDER_EVENTS.CREATED, {
        reminder: {
          channel: created.channel,
          id: created.id,
          isRecurring: created.isRecurring,
          message: created.message,
          targetId: created.targetId,
          targetType: created.targetType,
          type: created.type,
          userId: created.userId,
        },
      });
    });

    return created;
  });

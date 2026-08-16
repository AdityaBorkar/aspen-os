import { calendar } from "#/db-schemas";
import { CALENDAR_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { IdSchema, UpdateCalendarSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchCalendarStep } from "#/workflow-steps/fetch-calendar";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ id: IdSchema, input: UpdateCalendarSchema });

export const updateCalendar = Workflow.name("calendar.calendar.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdateCalendarSchema, input);

    const existing = await ctx.step.run(fetchCalendarStep, { id });

    await assertCanMutate(existing, ctx.actorId);

    if (parsed.isDefault === true) {
      await ctx.db
        .update(calendar)
        .set({ isDefault: false })
        .where(eq(calendar.ownerId, existing.ownerId));
    }

    const updates = stripUndefined({
      access: parsed.access,
      color: parsed.color,
      description: parsed.description,
      isDefault: parsed.isDefault,
      name: parsed.name,
      timezone: parsed.timezone,
      updatedBy: ctx.actorId ?? null,
    });

    const [updated] = await ctx.db
      .update(calendar)
      .set({ ...updates })
      .where(eq(calendar.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Calendar with id "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: parsed.isDefault === true ? AUDIT_ACTION.SET_DEFAULT : AUDIT_ACTION.UPDATED,
        changes: parsed,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CALENDAR,
        newState: { isDefault: updated.isDefault, name: updated.name },
        previousState: { isDefault: existing.isDefault, name: existing.name },
      });

      await ctx.pubsub.publish(CALENDAR_EVENTS.UPDATED, {
        calendar: {
          access: updated.access,
          id: updated.id,
          name: updated.name,
          ownerId: updated.ownerId,
        },
      });
    });

    return updated;
  });

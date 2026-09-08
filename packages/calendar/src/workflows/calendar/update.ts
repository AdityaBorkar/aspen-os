import { calendar } from "#/db-schemas";
import { CALENDAR_EVENTS } from "#/pubsub";
import { IdSchema, UpdateCalendarSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { assertCanMutate } from "#/workflow-steps/access-service";
import { fetchCalendarStep } from "#/workflow-steps/fetch";
import { toCalendarPayload } from "#/workflow-steps/payloads";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ id: IdSchema, input: UpdateCalendarSchema });

export const updateCalendar = Workflow.name("calendar.calendar.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdateCalendarSchema, input);

    const existing = await ctx.step.run(fetchCalendarStep, { id });

    await assertCanMutate(existing, ctx.actorId, ctx.db);

    const updates = stripUndefined({
      access: parsed.access,
      color: parsed.color,
      description: parsed.description,
      isDefault: parsed.isDefault,
      name: parsed.name,
      timezone: parsed.timezone,
      updatedBy: ctx.actorId ?? null,
    });

    const updated = await ctx.db.transaction(async (tx) => {
      if (parsed.isDefault === true) {
        await tx
          .update(calendar)
          .set({ is_default: false })
          .where(eq(calendar.owner_id, existing.owner_id));
      }

      const [row] = await tx.update(calendar).set(updates).where(eq(calendar.id, id)).returning();

      if (!row) {
        throw new Error(`Calendar with id "${id}" not found.`);
      }
      return row;
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: parsed.isDefault === true ? AUDIT_ACTION.SET_DEFAULT : AUDIT_ACTION.UPDATED,
        changes: parsed,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CALENDAR,
        newState: { is_default: updated.is_default, name: updated.name },
        previousState: { is_default: existing.is_default, name: existing.name },
      });

      await ctx.pubsub.publish(CALENDAR_EVENTS.UPDATED, {
        calendar: toCalendarPayload(updated),
      });
    });

    return updated;
  });

import { calendar } from "#/db-schemas";
import { CALENDAR_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchCalendarStep } from "#/workflow-steps/fetch-calendar";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const SetDefaultInputSchema = object({ id: IdSchema });

export const setDefaultCalendar = Workflow.name("calendar.calendar.set-default")
  .input(SetDefaultInputSchema)
  .handler(async ({ id }, ctx) => {
    const found = await ctx.step.run(fetchCalendarStep, { id });

    await assertCanMutate(found, ctx.actorId);

    await ctx.db
      .update(calendar)
      .set({ isDefault: false })
      .where(eq(calendar.ownerId, found.ownerId));

    const [updated] = await ctx.db
      .update(calendar)
      .set({ isDefault: true, updatedBy: ctx.actorId ?? null })
      .where(eq(calendar.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Calendar with id "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SET_DEFAULT,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CALENDAR,
        newState: { isDefault: true },
        previousState: { isDefault: found.isDefault },
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

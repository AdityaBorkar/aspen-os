import { calendar } from "#/db-schemas";
import { CALENDAR_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertCanMutate } from "#/workflow-steps/access-service";
import { fetchCalendarStep } from "#/workflow-steps/fetch";
import { toCalendarPayload } from "#/workflow-steps/payloads";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const SetDefaultInputSchema = object({ id: IdSchema });

export const setDefaultCalendar = Workflow.name("calendar.calendar.set-default")
  .input(SetDefaultInputSchema)
  .handler(async ({ id }, ctx) => {
    const found = await ctx.step.run(fetchCalendarStep, { id });

    await assertCanMutate(found, ctx.actorId, ctx.db);

    const updated = await ctx.db.transaction(async (tx) => {
      await tx
        .update(calendar)
        .set({ is_default: false })
        .where(eq(calendar.owner_id, found.owner_id));

      const [row] = await tx
        .update(calendar)
        .set({ is_default: true, updated_by: ctx.actorId ?? null })
        .where(eq(calendar.id, id))
        .returning();

      if (!row) {
        throw new Error(`Calendar with id "${id}" not found.`);
      }
      return row;
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SET_DEFAULT,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.CALENDAR,
        newState: { isDefault: true },
        previousState: { is_default: found.is_default },
      });

      await ctx.pubsub.publish(CALENDAR_EVENTS.UPDATED, {
        calendar: toCalendarPayload(updated),
      });
    });

    return updated;
  });

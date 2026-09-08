import { calendar } from "#/db-schemas";
import { CALENDAR_EVENTS } from "#/pubsub";
import { CreateCalendarSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, DEFAULT_CALENDAR_TIMEZONE } from "#/utils/constants";
import { resolveActorId } from "#/workflow-steps/access-service";
import { toCalendarPayload } from "#/workflow-steps/payloads";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateCalendarSchema });

export const createCalendar = Workflow.name("calendar.calendar.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateCalendarSchema, input);
    const ownerId = resolveActorId(ctx.actorId);

    const [existing] = await ctx.db
      .select({ id: calendar.id })
      .from(calendar)
      .where(eq(calendar.owner_id, ownerId))
      .limit(1);

    const isDefault = parsed.isDefault === true || !existing;

    const created = await ctx.db.transaction(async (tx) => {
      if (isDefault) {
        await tx.update(calendar).set({ is_default: false }).where(eq(calendar.owner_id, ownerId));
      }

      const [row] = await tx
        .insert(calendar)
        .values({
          access: parsed.access,
          color: parsed.color ?? null,
          created_by: ownerId,
          description: parsed.description ?? null,
          is_default: isDefault,
          name: parsed.name,
          owner_id: ownerId,
          timezone: parsed.timezone ?? DEFAULT_CALENDAR_TIMEZONE,
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create calendar.");
      }
      return row;
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.CALENDAR,
        newState: { is_default: created.is_default, name: created.name },
      });

      await ctx.pubsub.publish(CALENDAR_EVENTS.CREATED, {
        calendar: toCalendarPayload(created),
      });
    });

    return created;
  });

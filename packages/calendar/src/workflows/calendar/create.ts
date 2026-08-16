import { calendar } from "#/db-schemas";
import { CALENDAR_EVENTS } from "#/pubsub";
import { resolveActorId } from "#/services/access-service";
import { CreateCalendarSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

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
      .where(eq(calendar.ownerId, ownerId))
      .limit(1);

    const isDefault = parsed.isDefault === true || !existing;

    if (isDefault) {
      await ctx.db.update(calendar).set({ isDefault: false }).where(eq(calendar.ownerId, ownerId));
    }

    const [created] = await ctx.db
      .insert(calendar)
      .values({
        access: parsed.access,
        color: parsed.color ?? null,
        createdBy: ownerId,
        description: parsed.description ?? null,
        isDefault,
        name: parsed.name,
        ownerId,
        timezone: parsed.timezone ?? "UTC",
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create calendar.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.CALENDAR,
        newState: { isDefault: created.isDefault, name: created.name },
      });

      await ctx.pubsub.publish(CALENDAR_EVENTS.CREATED, {
        calendar: {
          access: created.access,
          id: created.id,
          name: created.name,
          ownerId: created.ownerId,
        },
      });
    });

    return created;
  });

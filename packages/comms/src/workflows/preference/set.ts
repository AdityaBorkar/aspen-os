import { commsPreference } from "#/db-schemas";
import { PREFERENCE_EVENTS } from "#/pubsub";
import { SetPreferenceSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { object, parse } from "valibot";

const SetInputSchema = object({ input: SetPreferenceSchema });

export const setPreference = Workflow.name("comms.preference.set")
  .input(SetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SetPreferenceSchema, input);
    const type = parsed.type ?? null;

    const existing = await ctx.db
      .select({ id: commsPreference.id, priority: commsPreference.priority })
      .from(commsPreference)
      .where(
        and(
          eq(commsPreference.userId, parsed.userId),
          type === null ? isNull(commsPreference.type) : eq(commsPreference.type, type),
          eq(commsPreference.channelType, parsed.channelType),
        ),
      )
      .limit(1);

    const [row] = existing;

    const [updated] = row
      ? await ctx.db
          .update(commsPreference)
          .set({
            enabled: parsed.enabled,
            priority: parsed.priority ?? row.priority ?? builtinPriority(parsed.channelType),
            type,
            updatedAt: new Date(),
          })
          .where(eq(commsPreference.id, row.id))
          .returning()
      : await ctx.db
          .insert(commsPreference)
          .values({
            channelType: parsed.channelType,
            enabled: parsed.enabled,
            priority: parsed.priority ?? builtinPriority(parsed.channelType),
            type,
            userId: parsed.userId,
          })
          .returning();

    if (!updated) {
      throw new Error("Failed to upsert preference.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.PREFERENCE,
        newState: {
          channelType: updated.channelType,
          enabled: updated.enabled,
          type: updated.type,
          userId: updated.userId,
        },
      });

      await ctx.pubsub.publish(PREFERENCE_EVENTS.UPDATED, {
        channelType: updated.channelType,
        enabled: updated.enabled,
        type: updated.type,
        userId: updated.userId,
      });
    });

    return updated;
  });

function builtinPriority(channelType: string): number {
  switch (channelType) {
    case "inapp": {
      return 1;
    }
    case "email": {
      return 2;
    }
    case "sms": {
      return 3;
    }
    case "whatsapp": {
      return 4;
    }
    default: {
      return 5;
    }
  }
}

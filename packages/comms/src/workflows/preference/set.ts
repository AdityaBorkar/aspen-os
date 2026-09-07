import { commsPreference } from "#/db-schemas";
import { PREFERENCE_EVENTS } from "#/pubsub";
import { SetPreferenceSchema } from "#/schemas/preference";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, channelTypePriority } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { object } from "valibot";

const SetInputSchema = object({ input: SetPreferenceSchema });

export const setPreference = Workflow.name("comms.preference.set")
  .input(SetInputSchema)
  .handler(async ({ input }, ctx) => {
    const type = input.type ?? null;

    const existing = await ctx.db
      .select({ id: commsPreference.id, priority: commsPreference.priority })
      .from(commsPreference)
      .where(
        and(
          eq(commsPreference.userId, input.userId),
          type === null ? isNull(commsPreference.type) : eq(commsPreference.type, type),
          eq(commsPreference.channelType, input.channelType),
        ),
      )
      .limit(1);

    const [row] = existing;

    const [updated] = row
      ? await ctx.db
          .update(commsPreference)
          .set({
            enabled: input.enabled,
            priority: input.priority ?? row.priority ?? channelTypePriority(input.channelType),
            type,
            updatedAt: new Date(),
          })
          .where(eq(commsPreference.id, row.id))
          .returning()
      : await ctx.db
          .insert(commsPreference)
          .values({
            channelType: input.channelType,
            enabled: input.enabled,
            priority: input.priority ?? channelTypePriority(input.channelType),
            type,
            userId: input.userId,
          })
          .returning();

    if (!updated) {
      throw new Error("Failed to upsert preference.");
    }

    await auditAndPublish(ctx, {
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.PREFERENCE,
      event: {
        payload: {
          channelType: updated.channelType,
          enabled: updated.enabled,
          type: updated.type,
          userId: updated.userId,
        },
        topic: PREFERENCE_EVENTS.UPDATED,
      },
      newState: {
        channelType: updated.channelType,
        enabled: updated.enabled,
        type: updated.type,
        userId: updated.userId,
      },
    });

    return updated;
  });

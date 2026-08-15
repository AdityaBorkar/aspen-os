import { dmsClass } from "#/db-schemas";
import { CLASS_EVENTS } from "#/pubsub";
import { IdSchema, UpdateClassSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchClassStep } from "#/workflow-steps/fetch-class";

import { Workflow } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateClassSchema,
});

export const updateClass = Workflow.name("dms.class.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const current = await ctx.step.run(fetchClassStep, { id });

    const updates = stripUndefined({
      color: patch.color,
      description: patch.description,
      fileNamingSchema: patch.fileNamingSchema,
      icon: patch.icon,
      name: patch.name,
      retentionDays: patch.retentionDays,
    });

    const [updated] = await ctx.db
      .update(dmsClass)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dmsClass.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Class "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      // SAFETY: diff() compares JsonValue-typed state snapshots.
      // New/old values are JSON-safe and fit the audit entry's changes contract.
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: ctx.audit.diff(
          { name: current.name, retentionDays: current.retentionDays },
          { name: updated.name, retentionDays: updated.retentionDays },
        ) as Record<string, JsonValue> | undefined,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.CLASS,
        newState: { name: updated.name, retentionDays: updated.retentionDays },
        previousState: {
          name: current.name,
          retentionDays: current.retentionDays,
        },
      });

      await ctx.pubsub.publish(CLASS_EVENTS.UPDATED, { classId: id });
    });

    return updated;
  });

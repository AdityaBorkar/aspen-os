import { dmsClassField } from "#/db-schemas";
import { CLASS_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const DeactivateFieldInputSchema = object({ id: IdSchema });

export const deactivateClassField = Workflow.name("dms.class.deactivate-field")
  .input(DeactivateFieldInputSchema)
  .handler(async ({ id }, ctx) => {
    const [current] = await ctx.db
      .select()
      .from(dmsClassField)
      .where(eq(dmsClassField.id, id))
      .limit(1);

    if (!current) {
      throw new Error(`Class field "${id}" not found.`);
    }
    if (!current.isActive) {
      throw new Error(`Class field "${id}" is already inactive.`);
    }

    const [updated] = await ctx.db
      .update(dmsClassField)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(dmsClassField.id, id))
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: current.classId,
        entityType: AUDIT_ENTITY_TYPE.CLASS,
        metadata: { fieldId: id, fieldName: current.name },
        newState: { isActive: false },
        previousState: { isActive: true },
      });

      await ctx.pubsub.publish(CLASS_EVENTS.UPDATED, {
        classId: current.classId,
      });
    });

    return updated ?? current;
  });

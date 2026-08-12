import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsClassField } from "../db-schemas";
import { CLASS_EVENTS } from "../pubsub";
import { IdSchema, UpdateClassFieldSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { stripUndefined } from "../utils/strip-undefined";

const UpdateFieldInputSchema = object({
  id: IdSchema,
  patch: UpdateClassFieldSchema,
});

export const updateClassField = Workflow.name("dms.class.update-field")
  .input(UpdateFieldInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const [current] = await ctx.db
      .select()
      .from(dmsClassField)
      .where(eq(dmsClassField.id, id))
      .limit(1);

    if (!current) {
      throw new Error(`Class field "${id}" not found.`);
    }

    const updates = stripUndefined({
      defaultValue: patch.defaultValue,
      includeInSearch: patch.includeInSearch,
      isRequired: patch.isRequired,
      label: patch.label,
      options: patch.options,
      sortOrder: patch.sortOrder,
    });

    const [updated] = await ctx.db
      .update(dmsClassField)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dmsClassField.id, id))
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: current.classId,
        entityType: AUDIT_ENTITY_TYPE.CLASS,
        metadata: { fieldId: id, fieldName: current.name },
        newState: { ...updates },
        previousState: {
          defaultValue: current.defaultValue,
          includeInSearch: current.includeInSearch,
          isRequired: current.isRequired,
          label: current.label,
          options: current.options,
          sortOrder: current.sortOrder,
        },
      });

      await ctx.pubsub.publish(CLASS_EVENTS.UPDATED, {
        classId: current.classId,
      });
    });

    return updated ?? current;
  });

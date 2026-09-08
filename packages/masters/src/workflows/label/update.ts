import { masterLabel } from "#/db-schemas";
import { LABEL_EVENTS } from "#/pubsub";
import { IdSchema, UpdateLabelSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ id: IdSchema, patch: UpdateLabelSchema });

export const updateLabel = Workflow.name("masters.label.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const parsed = parse(UpdateLabelSchema, patch);

    const updates = stripUndefined({
      color: parsed.color,
      name: parsed.name,
      scope_id: parsed.scopeId,
      scope_type: parsed.scopeType,
    });

    if (Object.keys(updates).length === 0) {
      const [current] = await ctx.db
        .select()
        .from(masterLabel)
        .where(eq(masterLabel.id, id))
        .limit(1);
      if (!current) {
        throw new Error(`Label "${id}" not found.`);
      }
      return current;
    }

    const [updated] = await ctx.db
      .update(masterLabel)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(masterLabel.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Label "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.LABEL,
        newState: {
          color: updated.color,
          name: updated.name,
          scopeId: updated.scope_id,
          scopeType: updated.scope_type,
        },
      });

      // SAFETY: updates contains only validated primitive fields (name, color, scope) from parsed input.
      await ctx.pubsub.publish(LABEL_EVENTS.UPDATED, {
        changes: updates,
        label: { id: updated.id, name: updated.name },
      });
    });

    return updated;
  });

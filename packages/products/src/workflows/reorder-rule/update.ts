import { productsReorderRule } from "#/db-schemas";
import { REORDER_RULE_EVENTS } from "#/pubsub";
import { UpdateReorderRuleSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchReorderRuleStep } from "#/workflow-steps/fetch";
import { eventChanges, runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({ id: string(), patch: UpdateReorderRuleSchema });

export const updateReorderRule = Workflow.name("products.reorder-rule.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchReorderRuleStep, { id: input.id });
    if (input.patch.reorderLevel !== undefined && input.patch.reorderLevel < 0) {
      throw new Error("reorderLevel must be >= 0.");
    }
    if (input.patch.reorderQty !== undefined && input.patch.reorderQty <= 0) {
      throw new Error("reorderQty must be > 0.");
    }
    const updates = stripUndefined({
      check_in_group_id: input.patch.checkInGroupId,
      is_disabled: input.patch.isDisabled,
      material_request_type: input.patch.materialRequestType,
      reorder_level: input.patch.reorderLevel,
      reorder_qty: input.patch.reorderQty,
      request_for_warehouse_id: input.patch.requestForWarehouseId,
    });
    if (Object.keys(updates).length === 0) {
      return ctx.step.run(fetchReorderRuleStep, { id: input.id });
    }
    const [updated] = await ctx.db
      .update(productsReorderRule)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(productsReorderRule.id, input.id))
      .returning();
    if (!updated) {
      throw new Error(`Reorder rule with id "${input.id}" not found.`);
    }
    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.REORDER_RULE,
      },
      REORDER_RULE_EVENTS.UPDATED,
      {
        changes: eventChanges(updates),
        reorderRule: { id: updated.id, itemId: updated.item_id },
      },
    );
    return updated;
  });

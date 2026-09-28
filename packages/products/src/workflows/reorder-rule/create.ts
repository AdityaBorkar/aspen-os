import { productsReorderRule } from "#/db-schemas";
import { REORDER_RULE_EVENTS } from "#/pubsub";
import { CreateReorderRuleSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch-item";

import { Workflow } from "@aspen-os/platform/server";

export const createReorderRule = Workflow.name("products.reorder-rule.create")
  .input(CreateReorderRuleSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchItemStep, { id: input.itemId });
    if (input.reorderLevel < 0 || input.reorderQty <= 0) {
      throw new Error("reorderLevel must be >= 0 and reorderQty must be > 0.");
    }
    const [row] = await ctx.db
      .insert(productsReorderRule)
      .values({
        check_in_group_id: input.checkInGroupId,
        item_id: input.itemId,
        material_request_type: input.materialRequestType ?? "purchase",
        reorder_level: input.reorderLevel,
        reorder_qty: input.reorderQty,
        request_for_warehouse_id: input.requestForWarehouseId,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to create reorder rule.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.REORDER_RULE,
        newState: { itemId: row.item_id },
      });
      await ctx.pubsub.publish(REORDER_RULE_EVENTS.CREATED, {
        reorderRule: { id: row.id, itemId: row.item_id },
      });
    });
    return row;
  });

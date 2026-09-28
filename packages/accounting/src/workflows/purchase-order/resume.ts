import { accountingPurchaseOrder } from "#/db-schemas/purchase";
import { PURCHASE_ORDER_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const resumePurchaseOrder = Workflow.name("accounting.purchase-order.resume")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [existing] = await ctx.db
      .select()
      .from(accountingPurchaseOrder)
      .where(eq(accountingPurchaseOrder.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Purchase order "${id}" not found.`);
    }
    if (existing.status !== "on_hold") {
      throw new Error("Only on-hold purchase orders can be resumed.");
    }
    const [updated] = await ctx.db
      .update(accountingPurchaseOrder)
      .set({ status: "to_receive_and_bill", updated_at: new Date() })
      .where(eq(accountingPurchaseOrder.id, id))
      .returning();
    const row = assertUpdated(updated, `Purchase order "${id}"`);
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.PURCHASE_ORDER,
        newState: { status: "to_receive_and_bill" },
      });
      await ctx.pubsub.publish(PURCHASE_ORDER_EVENTS.UPDATED, { purchaseOrderId: id });
    });
    return row;
  });

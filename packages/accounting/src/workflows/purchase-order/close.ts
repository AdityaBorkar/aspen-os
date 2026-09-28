import { accountingPurchaseOrder } from "#/db-schemas/purchase";
import { PURCHASE_ORDER_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const closePurchaseOrder = Workflow.name("accounting.purchase-order.close")
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
    if (
      existing.status === "closed" ||
      existing.status === "cancelled" ||
      existing.status === "completed"
    ) {
      return existing;
    }
    const [updated] = await ctx.db
      .update(accountingPurchaseOrder)
      .set({ status: "closed", updated_at: new Date() })
      .where(eq(accountingPurchaseOrder.id, id))
      .returning();
    const row = assertUpdated(updated, `Purchase order "${id}"`);
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CLOSED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { status: "closed" },
      });
      await ctx.pubsub.publish(PURCHASE_ORDER_EVENTS.CLOSED, { purchaseOrderId: id });
    });
    return row;
  });

import { accountingPurchaseOrder } from "#/db-schemas/purchase";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const holdPurchaseOrder = Workflow.name("accounting.purchase-order.hold")
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
      existing.status === "completed" ||
      existing.status === "closed" ||
      existing.status === "cancelled"
    ) {
      throw new Error("Completed, closed, or cancelled orders cannot be held.");
    }
    const [updated] = await ctx.db
      .update(accountingPurchaseOrder)
      .set({ status: "on_hold", updated_at: new Date() })
      .where(eq(accountingPurchaseOrder.id, id))
      .returning();
    const row = assertUpdated(updated, `Purchase order "${id}"`);
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { status: "on_hold" },
      });
    });
    return row;
  });

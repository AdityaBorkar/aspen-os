import { accountingSalesOrder } from "#/db-schemas/sales";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const holdSalesOrder = Workflow.name("accounting.sales-order.hold")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [existing] = await ctx.db
      .select()
      .from(accountingSalesOrder)
      .where(eq(accountingSalesOrder.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Sales order "${id}" not found.`);
    }
    if (
      existing.status === "completed" ||
      existing.status === "closed" ||
      existing.status === "cancelled"
    ) {
      throw new Error("Completed, closed, or cancelled orders cannot be held.");
    }

    const [updated] = await ctx.db
      .update(accountingSalesOrder)
      .set({ status: "on_hold", updated_at: new Date() })
      .where(eq(accountingSalesOrder.id, id))
      .returning();

    const row = assertUpdated(updated, `Sales order "${id}"`);

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

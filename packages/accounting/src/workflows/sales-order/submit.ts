import { accountingSalesOrder } from "#/db-schemas/sales";
import { SALES_ORDER_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const submitSalesOrder = Workflow.name("accounting.sales-order.submit")
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
    if (existing.status !== "draft") {
      throw new Error("Only draft sales orders can be submitted.");
    }

    const [updated] = await ctx.db
      .update(accountingSalesOrder)
      .set({ status: "to_deliver_and_bill", updated_at: new Date() })
      .where(eq(accountingSalesOrder.id, id))
      .returning();

    const row = assertUpdated(updated, `Sales order "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SUBMITTED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { status: "to_deliver_and_bill" },
      });
      await ctx.pubsub.publish(SALES_ORDER_EVENTS.UPDATED, { salesOrderId: id });
    });

    return row;
  });

import { accountingSalesOrder } from "#/db-schemas/sales";
import { SALES_ORDER_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const closeSalesOrder = Workflow.name("accounting.sales-order.close")
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
      existing.status === "closed" ||
      existing.status === "cancelled" ||
      existing.status === "completed"
    ) {
      return existing;
    }

    const [updated] = await ctx.db
      .update(accountingSalesOrder)
      .set({ status: "closed", updated_at: new Date() })
      .where(eq(accountingSalesOrder.id, id))
      .returning();

    const row = assertUpdated(updated, `Sales order "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CLOSED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { status: "closed" },
      });
      await ctx.pubsub.publish(SALES_ORDER_EVENTS.CLOSED, { salesOrderId: id });
    });

    return row;
  });

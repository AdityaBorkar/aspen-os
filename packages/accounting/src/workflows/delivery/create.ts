import {
  accountingDeliveryItem,
  accountingDeliveryNote,
  accountingSalesOrder,
  accountingSalesOrderItem,
} from "#/db-schemas/sales";
import { DELIVERY_EVENTS } from "#/pubsub";
import { CreateDeliveryNoteSchema } from "#/schemas/sales";
import { assertPeriodOpen } from "#/services/fiscal-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney, roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateDeliveryNoteSchema });

export const createDeliveryNote = Workflow.name("accounting.delivery.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDeliveryNoteSchema, input);

    await assertPeriodOpen({ db: ctx.db, postingDate: parsed.postingDate });

    const orderId: string | null = parsed.salesOrderId ?? null;
    if (orderId) {
      const [order] = await ctx.db
        .select()
        .from(accountingSalesOrder)
        .where(eq(accountingSalesOrder.id, orderId))
        .limit(1);
      if (!order) {
        throw new Error(`Sales order "${orderId}" not found.`);
      }
      if (order.status === "cancelled" || order.status === "closed") {
        throw new Error("Cannot deliver against a cancelled or closed order.");
      }
    }

    const [note] = await ctx.db
      .insert(accountingDeliveryNote)
      .values({
        customer_id: parsed.customerId,
        file_id: parsed.fileId ?? null,
        posting_date: parsed.postingDate,
        sales_order_id: orderId,
        status: "submitted",
        warehouse_id: parsed.warehouseId ?? null,
      })
      .returning();

    if (!note) {
      throw new Error("Failed to create delivery note.");
    }

    await ctx.db.insert(accountingDeliveryItem).values(
      parsed.items.map((item) => ({
        delivery_id: note.id,
        item_id: item.itemId,
        qty: toMoney(item.qty ?? 1),
        sales_order_id: orderId,
        sales_order_item_id: null,
        uom: item.uom ?? null,
        warehouse_id: item.warehouseId ?? parsed.warehouseId ?? null,
      })),
    );

    if (orderId) {
      const orderItems = await ctx.db
        .select()
        .from(accountingSalesOrderItem)
        .where(eq(accountingSalesOrderItem.sales_order_id, orderId));
      let totalQty = 0;
      let deliveredQty = 0;
      for (const orderItem of orderItems) {
        totalQty += parseMoney(orderItem.qty);
      }
      for (const delivered of parsed.items) {
        deliveredQty += delivered.qty ?? 1;
        const match = orderItems.find((candidate) => candidate.item_id === delivered.itemId);
        if (match) {
          const next = roundMoney(parseMoney(match.delivered_qty) + (delivered.qty ?? 1));
          await ctx.db
            .update(accountingSalesOrderItem)
            .set({ delivered_qty: toMoney(next) })
            .where(eq(accountingSalesOrderItem.id, match.id));
        }
      }
      const orderDelivered =
        orderItems.length > 0 ? roundMoney((deliveredQty / Math.max(totalQty, 1)) * 100) : 0;
      const [current] = await ctx.db
        .select()
        .from(accountingSalesOrder)
        .where(eq(accountingSalesOrder.id, orderId))
        .limit(1);
      if (current) {
        const prior = parseMoney(current.delivered_percent);
        const next = Math.min(100, roundMoney(prior + orderDelivered));
        let { status } = current;
        if (next >= 100) {
          status = parseMoney(current.billed_percent) >= 100 ? "completed" : "to_bill";
        } else if (status === "to_deliver_and_bill") {
          status = "to_deliver_and_bill";
        }
        await ctx.db
          .update(accountingSalesOrder)
          .set({ delivered_percent: toMoney(next), status, updated_at: new Date() })
          .where(eq(accountingSalesOrder.id, orderId));
      }
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: note.id,
        entityType: AUDIT_ENTITY_TYPE.DELIVERY,
        newState: { customerId: note.customer_id },
      });
      await ctx.pubsub.publish(DELIVERY_EVENTS.CREATED, { deliveryId: note.id });
    });

    return note;
  });

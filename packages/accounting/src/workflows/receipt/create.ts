import {
  accountingPurchaseOrder,
  accountingPurchaseOrderItem,
  accountingReceiptItem,
  accountingReceiptNote,
} from "#/db-schemas/purchase";
import { RECEIPT_EVENTS } from "#/pubsub";
import { CreateReceiptNoteSchema } from "#/schemas/purchase";
import { assertPeriodOpen } from "#/services/fiscal-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney, roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateReceiptNoteSchema });

export const createReceiptNote = Workflow.name("accounting.receipt.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateReceiptNoteSchema, input);

    await assertPeriodOpen({ db: ctx.db, postingDate: parsed.postingDate });

    if (parsed.purchaseOrderId) {
      const [order] = await ctx.db
        .select()
        .from(accountingPurchaseOrder)
        .where(eq(accountingPurchaseOrder.id, parsed.purchaseOrderId))
        .limit(1);
      if (!order) {
        throw new Error(`Purchase order "${parsed.purchaseOrderId}" not found.`);
      }
      if (order.status === "cancelled" || order.status === "closed") {
        throw new Error("Cannot receive against a cancelled or closed order.");
      }
    }

    const [note] = await ctx.db
      .insert(accountingReceiptNote)
      .values({
        file_id: parsed.fileId ?? null,
        posting_date: parsed.postingDate,
        purchase_order_id: parsed.purchaseOrderId ?? null,
        quality_notes: parsed.qualityNotes ?? null,
        status: "submitted",
        supplier_id: parsed.supplierId,
        warehouse_id: parsed.warehouseId ?? null,
      })
      .returning();

    if (!note) {
      throw new Error("Failed to create receipt note.");
    }

    await ctx.db.insert(accountingReceiptItem).values(
      parsed.items.map((item) => ({
        item_id: item.itemId,
        purchase_order_id: parsed.purchaseOrderId ?? null,
        purchase_order_item_id: null,
        qty: toMoney(item.qty ?? 1),
        receipt_id: note.id,
        uom: item.uom ?? null,
        warehouse_id: item.warehouseId ?? parsed.warehouseId ?? null,
      })),
    );

    if (parsed.purchaseOrderId) {
      const orderItems = await ctx.db
        .select()
        .from(accountingPurchaseOrderItem)
        .where(eq(accountingPurchaseOrderItem.purchase_order_id, parsed.purchaseOrderId));
      let totalQty = 0;
      let receivedNow = 0;
      for (const orderItem of orderItems) {
        totalQty += parseMoney(orderItem.qty);
      }
      for (const received of parsed.items) {
        receivedNow += received.qty ?? 1;
        const match = orderItems.find((candidate) => candidate.item_id === received.itemId);
        if (match) {
          const next = roundMoney(parseMoney(match.received_qty) + (received.qty ?? 1));
          await ctx.db
            .update(accountingPurchaseOrderItem)
            .set({ received_qty: toMoney(next) })
            .where(eq(accountingPurchaseOrderItem.id, match.id));
        }
      }
      const [current] = await ctx.db
        .select()
        .from(accountingPurchaseOrder)
        .where(eq(accountingPurchaseOrder.id, parsed.purchaseOrderId))
        .limit(1);
      if (current) {
        const prior = parseMoney(current.received_percent);
        const increment = totalQty > 0 ? roundMoney((receivedNow / totalQty) * 100) : 0;
        const next = Math.min(100, roundMoney(prior + increment));
        let { status } = current;
        if (next >= 100) {
          status = parseMoney(current.billed_percent) >= 100 ? "completed" : "to_bill";
        }
        await ctx.db
          .update(accountingPurchaseOrder)
          .set({ received_percent: toMoney(next), status, updated_at: new Date() })
          .where(eq(accountingPurchaseOrder.id, current.id));
      }
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: note.id,
        entityType: AUDIT_ENTITY_TYPE.RECEIPT,
        newState: { supplierId: note.supplier_id },
      });
      await ctx.pubsub.publish(RECEIPT_EVENTS.CREATED, { receiptId: note.id });
    });

    return note;
  });

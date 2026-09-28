import { inventoryReconciliation } from "#/db-schemas/reconciliation";
import { inventoryReconciliationItem } from "#/db-schemas/reconciliation-item";
import { inventorySerial } from "#/db-schemas/serial";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { RECONCILIATION_EVENTS, STOCK_EVENTS } from "#/pubsub";
import { toDateOnly } from "#/services/stock-math";
import {
  assertSerialsAvailable,
  ensureBatchExists,
  reverseVoucher,
} from "#/services/stock-posting";
import {
  assertFreezeAllowed,
  getEffectiveSetting,
  getStockValuation,
  requireWarehouse,
} from "#/services/stock-service";
import { ReconciliationFiltersSchema, SubmitReconciliationSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

export const submitReconciliation = Workflow.name("inventory.reconciliation.submit")
  .input(object({ input: SubmitReconciliationSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SubmitReconciliationSchema, input);
    const [reconciliation] = await ctx.db
      .select()
      .from(inventoryReconciliation)
      .where(eq(inventoryReconciliation.id, parsed.id))
      .limit(1);
    if (!reconciliation) {
      throw new Error(`Reconciliation "${parsed.id}" not found.`);
    }
    if (reconciliation.status !== "draft") {
      throw new Error("Only draft reconciliations can be submitted.");
    }
    const setting = await getEffectiveSetting(ctx.db);
    assertFreezeAllowed(setting, reconciliation.posting_date, parsed.actorRole ?? null);
    const postingDate = toDateOnly(reconciliation.posting_date);

    const items = await ctx.db
      .select()
      .from(inventoryReconciliationItem)
      .where(eq(inventoryReconciliationItem.reconciliation_id, parsed.id));

    const ledgerIds: string[] = [];
    // oxlint-disable eslint/no-await-in-loop
    for (const item of items) {
      await requireWarehouse(ctx.db, item.warehouse_id);
      if (item.reconcile_mode === "reconcile_selected" && item.serial_nos.length === 0) {
        throw new Error("Reconcile-selected rows must list the serial numbers being reconciled.");
      }
      const valuation = await getStockValuation(ctx.db, item.item_id, item.warehouse_id);
      const currentAvg = valuation.qty > 0 ? valuation.value / valuation.qty : 0;
      const targetRate = item.valuation_rate ?? currentAvg;
      const targetQty = item.qty ?? valuation.qty;
      const delta = targetQty - valuation.qty;
      if (item.serial_nos.length > 0 && item.serial_nos.length !== Math.abs(delta)) {
        throw new Error(
          `Reconcile-selected rows must list exactly one serial per adjusted unit (delta ${delta}, listed ${item.serial_nos.length}).`,
        );
      }

      if (delta > 0) {
        if (item.batch_no) {
          await ensureBatchExists(ctx.db, item.item_id, item.batch_no);
        }
        const serials = item.serial_nos.length > 0 ? item.serial_nos : [null];
        for (const serialNo of serials) {
          const unitQty = item.serial_nos.length > 0 ? 1 : delta;
          const [ledger] = await ctx.db
            .insert(inventoryStockLedger)
            .values({
              batch_no: item.batch_no,
              item_id: item.item_id,
              posting_date: postingDate,
              posting_time: reconciliation.posting_time,
              qty_delta: unitQty,
              serial_no: serialNo,
              valuation_rate: targetRate,
              voucher_id: reconciliation.id,
              voucher_item_id: item.id,
              voucher_type: "reconciliation",
              warehouse_id: item.warehouse_id,
            })
            .returning();
          if (ledger) {
            ledgerIds.push(ledger.id);
          }
          if (serialNo) {
            await ctx.db.insert(inventorySerial).values({
              batch_no: item.batch_no,
              item_id: item.item_id,
              purchase_id: reconciliation.id,
              serial_no: serialNo,
              status: "available",
              valuation_rate: targetRate,
              warehouse_id: item.warehouse_id,
            });
          }
        }
      } else if (delta < 0) {
        if (item.serial_nos.length > 0) {
          await assertSerialsAvailable(ctx.db, {
            itemId: item.item_id,
            serialNos: item.serial_nos,
            warehouseId: item.warehouse_id,
          });
        }
        const serials = item.serial_nos.length > 0 ? item.serial_nos : [null];
        for (const serialNo of serials) {
          const unitQty = item.serial_nos.length > 0 ? -1 : delta;
          const [ledger] = await ctx.db
            .insert(inventoryStockLedger)
            .values({
              batch_no: item.batch_no,
              item_id: item.item_id,
              posting_date: postingDate,
              posting_time: reconciliation.posting_time,
              qty_delta: unitQty,
              serial_no: serialNo,
              valuation_rate: targetRate,
              voucher_id: reconciliation.id,
              voucher_item_id: item.id,
              voucher_type: "reconciliation",
              warehouse_id: item.warehouse_id,
            })
            .returning();
          if (ledger) {
            ledgerIds.push(ledger.id);
          }
          if (serialNo) {
            await ctx.db
              .update(inventorySerial)
              .set({
                delivery_id: reconciliation.id,
                status: "delivered",
                updated_at: new Date(),
                warehouse_id: null,
              })
              .where(eq(inventorySerial.serial_no, serialNo));
          }
        }
      } else if (item.valuation_rate !== null && valuation.qty > 0) {
        const [issue] = await ctx.db
          .insert(inventoryStockLedger)
          .values({
            batch_no: item.batch_no,
            item_id: item.item_id,
            posting_date: postingDate,
            posting_time: reconciliation.posting_time,
            qty_delta: -valuation.qty,
            valuation_rate: currentAvg,
            voucher_id: reconciliation.id,
            voucher_item_id: item.id,
            voucher_type: "reconciliation",
            warehouse_id: item.warehouse_id,
          })
          .returning();
        const [receipt] = await ctx.db
          .insert(inventoryStockLedger)
          .values({
            batch_no: item.batch_no,
            item_id: item.item_id,
            posting_date: postingDate,
            posting_time: reconciliation.posting_time,
            qty_delta: valuation.qty,
            valuation_rate: item.valuation_rate,
            voucher_id: reconciliation.id,
            voucher_item_id: item.id,
            voucher_type: "reconciliation",
            warehouse_id: item.warehouse_id,
          })
          .returning();
        if (issue) {
          ledgerIds.push(issue.id);
        }
        if (receipt) {
          ledgerIds.push(receipt.id);
        }
      } else {
        const [marker] = await ctx.db
          .insert(inventoryStockLedger)
          .values({
            batch_no: item.batch_no,
            item_id: item.item_id,
            posting_date: postingDate,
            posting_time: reconciliation.posting_time,
            qty_delta: 0,
            valuation_rate: targetRate,
            voucher_id: reconciliation.id,
            voucher_item_id: item.id,
            voucher_type: "reconciliation",
            warehouse_id: item.warehouse_id,
          })
          .returning();
        if (marker) {
          ledgerIds.push(marker.id);
        }
      }
    }
    // oxlint-enable eslint/no-await-in-loop
    await ctx.db
      .update(inventoryReconciliation)
      .set({ status: "submitted", updated_at: new Date() })
      .where(eq(inventoryReconciliation.id, parsed.id));

    await ctx.audit.write({
      action: AUDIT_ACTION.SUBMITTED,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.RECONCILIATION,
      newState: { id: parsed.id, purpose: reconciliation.purpose, status: "submitted" },
    });

    await ctx.pubsub.publish(RECONCILIATION_EVENTS.SUBMITTED, {
      postingDate,
      purpose: reconciliation.purpose,
      reconciliationId: parsed.id,
    });

    const rows = await ctx.db
      .select()
      .from(inventoryStockLedger)
      .where(
        and(
          eq(inventoryStockLedger.voucher_type, "reconciliation"),
          eq(inventoryStockLedger.voucher_id, parsed.id),
        ),
      );
    // oxlint-disable eslint/no-await-in-loop
    for (const row of rows) {
      await ctx.pubsub.publish(STOCK_EVENTS.CHANGED, {
        batchNo: row.batch_no ?? undefined,
        itemId: row.item_id,
        postingDate: row.posting_date,
        qtyDelta: row.qty_delta,
        serialNo: row.serial_no ?? undefined,
        valuationRate: row.valuation_rate,
        voucherId: parsed.id,
        voucherType: "reconciliation",
        warehouseId: row.warehouse_id,
      });
    }
    // oxlint-enable eslint/no-await-in-loop

    return { ledgerIds, reconciliationId: parsed.id };
  });

export const cancelReconciliation = Workflow.name("inventory.reconciliation.cancel")
  .input(object({ input: SubmitReconciliationSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SubmitReconciliationSchema, input);
    const [reconciliation] = await ctx.db
      .select()
      .from(inventoryReconciliation)
      .where(eq(inventoryReconciliation.id, parsed.id))
      .limit(1);
    if (!reconciliation) {
      throw new Error(`Reconciliation "${parsed.id}" not found.`);
    }
    if (reconciliation.status !== "submitted") {
      throw new Error("Only submitted reconciliations can be cancelled.");
    }
    const reversalIds = await reverseVoucher(ctx.db, {
      cancelVoucherType: "reconciliation_cancel",
      voucherId: parsed.id,
      voucherType: "reconciliation",
    });
    await ctx.db
      .update(inventoryReconciliation)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(inventoryReconciliation.id, parsed.id));

    await ctx.audit.write({
      action: AUDIT_ACTION.CANCELLED,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.RECONCILIATION,
      newState: { id: parsed.id, status: "cancelled" },
    });

    return { reconciliationId: parsed.id, reversalIds };
  });

export const listReconciliations = Workflow.name("inventory.reconciliation.list")
  .input(object({ filters: ReconciliationFiltersSchema }))
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(ReconciliationFiltersSchema, filters);
    const conditions: SQL[] = [];
    if (parsed.purpose) {
      conditions.push(eq(inventoryReconciliation.purpose, parsed.purpose));
    }
    if (parsed.status) {
      conditions.push(eq(inventoryReconciliation.status, parsed.status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await ctx.db
      .select()
      .from(inventoryReconciliation)
      .where(where)
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
    return rows;
  });

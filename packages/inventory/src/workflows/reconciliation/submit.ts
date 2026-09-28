import { inventoryReconciliation } from "#/db-schemas/reconciliation";
import { inventoryReconciliationItem } from "#/db-schemas/reconciliation-item";
import { inventorySerial } from "#/db-schemas/serial";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { RECONCILIATION_EVENTS, STOCK_EVENTS } from "#/pubsub";
import { toDateOnly } from "#/services/stock-math";
import { ensureBatchExists, reverseVoucher } from "#/services/stock-posting";
import {
  assertFreezeAllowed,
  getEffectiveSetting,
  getStockKey,
  getStockStates,
  requireWarehouse,
} from "#/services/stock-service";
import { ReconciliationFiltersSchema, SubmitReconciliationSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertReturned, paginationOf, whereFrom } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

type ReconciliationRow = typeof inventoryReconciliation.$inferSelect;
type ReconciliationItemRow = typeof inventoryReconciliationItem.$inferSelect;

interface ReconciliationLeg {
  batchNo: string | null;
  itemId: string;
  qtyDelta: number;
  rate: number;
  serialNo: string | null;
  voucherItemId: string;
  warehouseId: string;
}

interface BuiltReconciliationLegs {
  legs: ReconciliationLeg[];
  serialsToCreate: string[];
  serialsToDeliver: string[];
}

function buildLegsForItem(
  item: ReconciliationItemRow,
  onHandQty: number,
  currentAvg: number,
): BuiltReconciliationLegs {
  const targetRate = item.valuation_rate ?? currentAvg;
  const targetQty = item.qty ?? onHandQty;
  const delta = targetQty - onHandQty;
  if (item.serial_nos.length > 0 && item.serial_nos.length !== Math.abs(delta) && delta !== 0) {
    throw new Error(
      `Reconcile-selected rows must list exactly one serial per adjusted unit (delta ${delta}, listed ${item.serial_nos.length}).`,
    );
  }
  const direction = Math.sign(delta);
  if (direction > 0) {
    const serials = item.serial_nos.length > 0 ? item.serial_nos : [null];
    return {
      legs: serials.map((serialNo) => ({
        batchNo: item.batch_no,
        itemId: item.item_id,
        qtyDelta: item.serial_nos.length > 0 ? 1 : delta,
        rate: targetRate,
        serialNo,
        voucherItemId: item.id,
        warehouseId: item.warehouse_id,
      })),
      serialsToCreate: item.serial_nos,
      serialsToDeliver: [],
    };
  }
  if (direction < 0) {
    const serials = item.serial_nos.length > 0 ? item.serial_nos : [null];
    return {
      legs: serials.map((serialNo) => ({
        batchNo: item.batch_no,
        itemId: item.item_id,
        qtyDelta: item.serial_nos.length > 0 ? -1 : delta,
        rate: targetRate,
        serialNo,
        voucherItemId: item.id,
        warehouseId: item.warehouse_id,
      })),
      serialsToCreate: [],
      serialsToDeliver: item.serial_nos,
    };
  }
  if (item.valuation_rate !== null && onHandQty > 0) {
    return {
      legs: [
        {
          batchNo: item.batch_no,
          itemId: item.item_id,
          qtyDelta: -onHandQty,
          rate: currentAvg,
          serialNo: null,
          voucherItemId: item.id,
          warehouseId: item.warehouse_id,
        },
        {
          batchNo: item.batch_no,
          itemId: item.item_id,
          qtyDelta: onHandQty,
          rate: item.valuation_rate,
          serialNo: null,
          voucherItemId: item.id,
          warehouseId: item.warehouse_id,
        },
      ],
      serialsToCreate: [],
      serialsToDeliver: [],
    };
  }
  return { legs: [], serialsToCreate: [], serialsToDeliver: [] };
}

export const submitReconciliation = Workflow.name("inventory.reconciliation.submit")
  .input(object({ input: SubmitReconciliationSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SubmitReconciliationSchema, input);
    const [reconciliation] = await ctx.db
      .select()
      .from(inventoryReconciliation)
      .where(eq(inventoryReconciliation.id, parsed.id))
      .limit(1);
    const header: ReconciliationRow = assertReturned(
      reconciliation,
      `Reconciliation "${parsed.id}" not found.`,
    );
    if (header.status !== "draft") {
      throw new Error("Only draft reconciliations can be submitted.");
    }
    const setting = await getEffectiveSetting(ctx.db);
    assertFreezeAllowed(setting, header.posting_date, parsed.actorRole ?? null);
    const postingDate = toDateOnly(header.posting_date);

    const items = await ctx.db
      .select()
      .from(inventoryReconciliationItem)
      .where(eq(inventoryReconciliationItem.reconciliation_id, parsed.id));

    for (const item of items) {
      if (item.reconcile_mode === "reconcile_selected" && item.serial_nos.length === 0) {
        throw new Error("Reconcile-selected rows must list the serial numbers being reconciled.");
      }
    }
    const states = await getStockStates(
      ctx.db,
      items.map((item) => ({ itemId: item.item_id, warehouseId: item.warehouse_id })),
    );
    const uniqueWarehouses = [...new Set(items.map((item) => item.warehouse_id))];
    for (const warehouseId of uniqueWarehouses) {
      await requireWarehouse(ctx.db, warehouseId);
    }

    const allLegs: ReconciliationLeg[] = [];
    const serialsToCreate: {
      batchNo: string | null;
      itemId: string;
      rate: number;
      serialNo: string;
      warehouseId: string;
    }[] = [];
    const serialsToDeliver: string[] = [];
    const batchesToEnsure = new Map<string, { batchNo: string; itemId: string }>();
    for (const item of items) {
      const state = states.get(getStockKey(item.item_id, item.warehouse_id));
      const onHand = state?.onHand ?? 0;
      const currentAvg = onHand > 0 ? (state?.value ?? 0) / onHand : 0;
      const built = buildLegsForItem(item, onHand, currentAvg);
      allLegs.push(...built.legs);
      if (item.batch_no && built.legs.some((leg) => leg.qtyDelta > 0)) {
        batchesToEnsure.set(`${item.item_id}::${item.batch_no}`, {
          batchNo: item.batch_no,
          itemId: item.item_id,
        });
      }
      for (const serialNo of built.serialsToCreate) {
        serialsToCreate.push({
          batchNo: item.batch_no,
          itemId: item.item_id,
          rate: item.valuation_rate ?? currentAvg,
          serialNo,
          warehouseId: item.warehouse_id,
        });
      }
      serialsToDeliver.push(...built.serialsToDeliver);
    }

    const ledgerIds = await ctx.db.transaction(async (tx) => {
      for (const batch of batchesToEnsure.values()) {
        await ensureBatchExists(tx, batch.itemId, batch.batchNo);
      }
      const inserted =
        allLegs.length === 0
          ? []
          : await tx
              .insert(inventoryStockLedger)
              .values(
                allLegs.map((leg) => ({
                  batch_no: leg.batchNo,
                  item_id: leg.itemId,
                  posting_date: postingDate,
                  posting_time: header.posting_time,
                  qty_delta: leg.qtyDelta,
                  serial_no: leg.serialNo,
                  valuation_rate: leg.rate,
                  voucher_id: header.id,
                  voucher_item_id: leg.voucherItemId,
                  voucher_type: "reconciliation",
                  warehouse_id: leg.warehouseId,
                })),
              )
              .returning({ id: inventoryStockLedger.id });
      if (serialsToCreate.length > 0) {
        await tx.insert(inventorySerial).values(
          serialsToCreate.map((entry) => ({
            batch_no: entry.batchNo,
            item_id: entry.itemId,
            purchase_id: header.id,
            serial_no: entry.serialNo,
            status: "available" as const,
            valuation_rate: entry.rate,
            warehouse_id: entry.warehouseId,
          })),
        );
      }
      for (const serialNo of serialsToDeliver) {
        await tx
          .update(inventorySerial)
          .set({
            delivery_id: header.id,
            status: "delivered",
            updated_at: new Date(),
            warehouse_id: null,
          })
          .where(eq(inventorySerial.serial_no, serialNo));
      }
      await tx
        .update(inventoryReconciliation)
        .set({ status: "submitted", updated_at: new Date() })
        .where(eq(inventoryReconciliation.id, parsed.id));
      return inserted.map((row) => row.id);
    });

    await ctx.audit.write({
      action: AUDIT_ACTION.SUBMITTED,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.RECONCILIATION,
      newState: { id: parsed.id, purpose: header.purpose, status: "submitted" },
    });

    await ctx.pubsub.publish(RECONCILIATION_EVENTS.SUBMITTED, {
      postingDate,
      purpose: header.purpose,
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
    await Promise.all(
      rows.map((row) =>
        ctx.pubsub.publish(STOCK_EVENTS.CHANGED, {
          batchNo: row.batch_no ?? undefined,
          itemId: row.item_id,
          postingDate: row.posting_date,
          qtyDelta: row.qty_delta,
          serialNo: row.serial_no ?? undefined,
          valuationRate: row.valuation_rate,
          voucherId: parsed.id,
          voucherType: "reconciliation",
          warehouseId: row.warehouse_id,
        }),
      ),
    );

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
    const reversalIds = await ctx.db.transaction(async (tx) => {
      const ids = await reverseVoucher(tx, {
        cancelVoucherType: "reconciliation_cancel",
        voucherId: parsed.id,
        voucherType: "reconciliation",
      });
      await tx
        .update(inventoryReconciliation)
        .set({ status: "cancelled", updated_at: new Date() })
        .where(eq(inventoryReconciliation.id, parsed.id));
      return ids;
    });

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
    const { limit, offset } = paginationOf(parsed);
    const rows = await ctx.db
      .select()
      .from(inventoryReconciliation)
      .where(whereFrom(conditions))
      .limit(limit)
      .offset(offset);
    return rows;
  });

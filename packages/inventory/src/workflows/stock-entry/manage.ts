import { inventoryAdditionalCost } from "#/db-schemas/additional-cost";
import { inventoryStockEntry } from "#/db-schemas/stock-entry";
import { inventoryStockEntryItem } from "#/db-schemas/stock-entry-item";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { STOCK_ENTRY_EVENTS, STOCK_EVENTS } from "#/pubsub";
import { toDateOnly, validateHeaderWarehouses } from "#/services/stock-math";
import { requireDraftEntry, reversePosting } from "#/services/stock-posting";
import {
  CancelStockEntrySchema,
  IdSchema,
  StockEntryFiltersSchema,
  UpdateStockEntrySchema,
} from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertReturned, paginationOf, whereFrom } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

export const updateStockEntry = Workflow.name("inventory.stock-entry.update")
  .input(object({ id: IdSchema, patch: UpdateStockEntrySchema }))
  .handler(async ({ id, patch }, ctx) => {
    const parsed = parse(UpdateStockEntrySchema, patch);
    const current = await requireDraftEntry(ctx.db, id);

    const sourceId =
      parsed.sourceWarehouseId !== undefined
        ? parsed.sourceWarehouseId
        : current.source_warehouse_id;
    const targetId =
      parsed.targetWarehouseId !== undefined
        ? parsed.targetWarehouseId
        : current.target_warehouse_id;
    validateHeaderWarehouses(current.purpose, sourceId, targetId);
    const headerSourceChanged =
      parsed.sourceWarehouseId !== undefined &&
      parsed.sourceWarehouseId !== current.source_warehouse_id;
    const headerTargetChanged =
      parsed.targetWarehouseId !== undefined &&
      parsed.targetWarehouseId !== current.target_warehouse_id;
    if ((headerSourceChanged || headerTargetChanged) && parsed.items === undefined) {
      throw new Error(
        "Row warehouses are captured at creation time: re-supply items when changing header warehouses.",
      );
    }

    const values: Partial<typeof inventoryStockEntry.$inferInsert> = {};
    if (parsed.addToTransit !== undefined) {
      values.add_to_transit = parsed.addToTransit;
    }
    if (parsed.allowZeroValuation !== undefined) {
      values.allow_zero_valuation = parsed.allowZeroValuation;
    }
    if (parsed.applyPutawayRule !== undefined) {
      values.apply_putaway_rule = parsed.applyPutawayRule;
    }
    if (parsed.inspectionRequired !== undefined) {
      values.inspection_required = parsed.inspectionRequired;
    }
    if (parsed.isOpening !== undefined) {
      values.is_opening = parsed.isOpening;
    }
    if (parsed.partyId !== undefined) {
      values.party_id = parsed.partyId;
    }
    if (parsed.postingDate !== undefined) {
      values.posting_date = toDateOnly(parsed.postingDate);
    }
    if (parsed.postingTime !== undefined) {
      values.posting_time = parsed.postingTime;
    }
    if (parsed.sourceWarehouseId !== undefined) {
      values.source_warehouse_id = parsed.sourceWarehouseId;
    }
    if (parsed.targetWarehouseId !== undefined) {
      values.target_warehouse_id = parsed.targetWarehouseId;
    }
    if (parsed.workOrderId !== undefined) {
      values.work_order_id = parsed.workOrderId;
    }

    const updated = await ctx.db.transaction(async (tx) => {
      const [row] = await tx
        .update(inventoryStockEntry)
        .set({ ...values, updated_at: new Date() })
        .where(eq(inventoryStockEntry.id, id))
        .returning();
      const next = assertReturned(row, "Failed to update stock entry.");

      if (parsed.items !== undefined) {
        await tx
          .delete(inventoryStockEntryItem)
          .where(eq(inventoryStockEntryItem.stock_entry_id, id));
        if (parsed.items.length > 0) {
          await tx.insert(inventoryStockEntryItem).values(
            parsed.items.map((item) => ({
              allow_negative_stock: item.allowNegativeStock ?? null,
              basic_rate: item.basicRate ?? null,
              batch_no: item.batchNo ?? null,
              conversion_factor: item.conversionFactor ?? 1,
              item_id: item.itemId,
              qty: item.qty,
              requires_batch: item.requiresBatch ?? false,
              requires_serial: item.requiresSerial ?? false,
              sales_order_id: item.salesOrderId ?? null,
              sales_order_item_id: item.salesOrderItemId ?? null,
              sample_qty: item.sampleQty ?? 0,
              serial_nos: item.serialNos ?? [],
              source_warehouse_id:
                item.sourceWarehouseId === undefined ? sourceId : item.sourceWarehouseId,
              stock_entry_id: id,
              target_warehouse_id:
                item.targetWarehouseId === undefined ? targetId : item.targetWarehouseId,
              uom: item.uom,
              valuation_method: item.valuationMethod ?? null,
            })),
          );
        }
      }

      if (parsed.additionalCosts !== undefined) {
        await tx
          .delete(inventoryAdditionalCost)
          .where(eq(inventoryAdditionalCost.stock_entry_id, id));
        if (parsed.additionalCosts.length > 0) {
          await tx.insert(inventoryAdditionalCost).values(
            parsed.additionalCosts.map((cost) => ({
              amount: cost.amount,
              description: cost.description ?? null,
              expense_account: cost.expenseAccount,
              stock_entry_id: id,
            })),
          );
        }
      }
      return next;
    });

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.STOCK_ENTRY,
      newState: { id, status: "draft" },
    });

    return updated;
  });

export const cancelStockEntry = Workflow.name("inventory.stock-entry.cancel")
  .input(object({ input: CancelStockEntrySchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CancelStockEntrySchema, input);
    const reversalIds = await ctx.step.run("reverse-posting", async () =>
      ctx.db.transaction(async (tx) => reversePosting(tx, parsed.id)),
    );

    const [entry] = await ctx.db
      .select()
      .from(inventoryStockEntry)
      .where(eq(inventoryStockEntry.id, parsed.id))
      .limit(1);

    await ctx.audit.write({
      action: AUDIT_ACTION.CANCELLED,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.STOCK_ENTRY,
      newState: { id: parsed.id, status: "cancelled" },
    });

    if (entry) {
      await ctx.pubsub.publish(STOCK_ENTRY_EVENTS.CANCELLED, {
        postingDate: toDateOnly(entry.posting_date),
        purpose: entry.purpose,
        stockEntryId: entry.id,
      });
      const reversals = await ctx.db
        .select()
        .from(inventoryStockLedger)
        .where(
          and(
            eq(inventoryStockLedger.voucher_type, "stock_entry_cancel"),
            eq(inventoryStockLedger.voucher_id, parsed.id),
          ),
        );
      await Promise.all(
        reversals.map((reversal) =>
          ctx.pubsub.publish(STOCK_EVENTS.CHANGED, {
            batchNo: reversal.batch_no ?? undefined,
            itemId: reversal.item_id,
            postingDate: reversal.posting_date,
            qtyDelta: reversal.qty_delta,
            serialNo: reversal.serial_no ?? undefined,
            valuationRate: reversal.valuation_rate,
            voucherId: parsed.id,
            voucherType: "stock_entry_cancel",
            warehouseId: reversal.warehouse_id,
          }),
        ),
      );
    }

    return { entry, reversalIds };
  });

export const amendStockEntry = Workflow.name("inventory.stock-entry.amend")
  .input(object({ input: CancelStockEntrySchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CancelStockEntrySchema, input);
    const draft = await ctx.db.transaction(async (tx) => {
      await ctx.step.run("reverse-posting", async () => reversePosting(tx, parsed.id));

      const [original] = await tx
        .select()
        .from(inventoryStockEntry)
        .where(eq(inventoryStockEntry.id, parsed.id))
        .limit(1);
      const source = assertReturned(original, `Stock entry "${parsed.id}" not found.`);
      const items = await tx
        .select()
        .from(inventoryStockEntryItem)
        .where(eq(inventoryStockEntryItem.stock_entry_id, parsed.id));
      const costs = await tx
        .select()
        .from(inventoryAdditionalCost)
        .where(eq(inventoryAdditionalCost.stock_entry_id, parsed.id));

      const [next] = await tx
        .insert(inventoryStockEntry)
        .values({
          add_to_transit: source.add_to_transit,
          allow_zero_valuation: source.allow_zero_valuation,
          amend_from: source.id,
          apply_putaway_rule: source.apply_putaway_rule,
          inspection_required: source.inspection_required,
          is_opening: source.is_opening,
          party_id: source.party_id,
          posting_date: source.posting_date,
          posting_time: source.posting_time,
          purpose: source.purpose,
          source_warehouse_id: source.source_warehouse_id,
          status: "draft",
          target_warehouse_id: source.target_warehouse_id,
          work_order_id: source.work_order_id,
        })
        .returning();
      const created = assertReturned(next, "Failed to create amended draft.");
      if (items.length > 0) {
        await tx.insert(inventoryStockEntryItem).values(
          items.map((item) => ({
            allow_negative_stock: item.allow_negative_stock,
            basic_rate: item.basic_rate,
            batch_no: item.batch_no,
            conversion_factor: item.conversion_factor,
            item_id: item.item_id,
            qty: item.qty,
            requires_batch: item.requires_batch,
            requires_serial: item.requires_serial,
            sales_order_id: item.sales_order_id,
            sales_order_item_id: item.sales_order_item_id,
            sample_qty: item.sample_qty,
            serial_nos: item.serial_nos,
            source_warehouse_id: item.source_warehouse_id,
            stock_entry_id: created.id,
            target_warehouse_id: item.target_warehouse_id,
            uom: item.uom,
            valuation_method: item.valuation_method,
            valuation_rate: item.valuation_rate,
          })),
        );
      }
      if (costs.length > 0) {
        await tx.insert(inventoryAdditionalCost).values(
          costs.map((cost) => ({
            amount: cost.amount,
            description: cost.description,
            expense_account: cost.expense_account,
            stock_entry_id: created.id,
          })),
        );
      }
      return created;
    });

    await ctx.audit.write({
      action: AUDIT_ACTION.AMENDED,
      crudAction: "create",
      entityId: draft.id,
      entityType: AUDIT_ENTITY_TYPE.STOCK_ENTRY,
      newState: { amendFrom: parsed.id, id: draft.id },
    });

    return draft;
  });

export const listStockEntries = Workflow.name("inventory.stock-entry.list")
  .input(object({ filters: StockEntryFiltersSchema }))
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(StockEntryFiltersSchema, filters);
    const conditions: SQL[] = [];
    if (parsed.purpose) {
      conditions.push(eq(inventoryStockEntry.purpose, parsed.purpose));
    }
    if (parsed.status) {
      conditions.push(eq(inventoryStockEntry.status, parsed.status));
    }
    if (parsed.warehouseId) {
      conditions.push(eq(inventoryStockEntry.target_warehouse_id, parsed.warehouseId));
    }
    if (parsed.itemId) {
      const itemRows = await ctx.db
        .select({ stock_entry_id: inventoryStockEntryItem.stock_entry_id })
        .from(inventoryStockEntryItem)
        .where(eq(inventoryStockEntryItem.item_id, parsed.itemId));
      const ids = [...new Set(itemRows.map((row) => row.stock_entry_id))];
      if (ids.length === 0) {
        return [];
      }
      conditions.push(inArray(inventoryStockEntry.id, ids));
    }
    const { limit, offset } = paginationOf(parsed);
    const rows = await ctx.db
      .select()
      .from(inventoryStockEntry)
      .where(whereFrom(conditions))
      .limit(limit)
      .offset(offset);
    return rows;
  });

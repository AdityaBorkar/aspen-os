import { inventoryAdditionalCost } from "#/db-schemas/additional-cost";
import { inventoryStockEntry } from "#/db-schemas/stock-entry";
import { inventoryStockEntryItem } from "#/db-schemas/stock-entry-item";
import { toDateOnly, validateHeaderWarehouses } from "#/services/stock-math";
import { CreateStockEntrySchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertReturned } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

export const createStockEntry = Workflow.name("inventory.stock-entry.create")
  .input(object({ input: CreateStockEntrySchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateStockEntrySchema, input);
    const headerSource = parsed.sourceWarehouseId ?? null;
    const headerTarget = parsed.targetWarehouseId ?? null;
    validateHeaderWarehouses(parsed.purpose, headerSource, headerTarget);

    const entry = await ctx.db.transaction(async (tx) => {
      const [header] = await tx
        .insert(inventoryStockEntry)
        .values({
          add_to_transit: parsed.addToTransit ?? false,
          allow_zero_valuation: parsed.allowZeroValuation ?? false,
          apply_putaway_rule: parsed.applyPutawayRule ?? false,
          inspection_required: parsed.inspectionRequired ?? false,
          is_opening: parsed.isOpening ?? false,
          party_id: parsed.partyId ?? null,
          posting_date: toDateOnly(parsed.postingDate),
          posting_time: parsed.postingTime ?? null,
          purpose: parsed.purpose,
          source_warehouse_id: parsed.sourceWarehouseId ?? null,
          status: "draft",
          target_warehouse_id: parsed.targetWarehouseId ?? null,
          work_order_id: parsed.workOrderId ?? null,
        })
        .returning();
      const created = assertReturned(header, "Failed to create stock entry.");

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
            item.sourceWarehouseId === undefined ? headerSource : item.sourceWarehouseId,
          stock_entry_id: created.id,
          target_warehouse_id:
            item.targetWarehouseId === undefined ? headerTarget : item.targetWarehouseId,
          uom: item.uom,
          valuation_method: item.valuationMethod ?? null,
        })),
      );

      const costs = parsed.additionalCosts ?? [];
      if (costs.length > 0) {
        await tx.insert(inventoryAdditionalCost).values(
          costs.map((cost) => ({
            amount: cost.amount,
            description: cost.description ?? null,
            expense_account: cost.expenseAccount,
            stock_entry_id: created.id,
          })),
        );
      }
      return created;
    });

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: entry.id,
      entityType: AUDIT_ENTITY_TYPE.STOCK_ENTRY,
      newState: { id: entry.id, purpose: entry.purpose, status: entry.status },
    });

    return entry;
  });

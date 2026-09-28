import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { StockLedgerFiltersSchema } from "#/types";
import { paginationOf, whereFrom } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

export const listLedgerEntries = Workflow.name("inventory.ledger.list")
  .input(object({ filters: StockLedgerFiltersSchema }))
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(StockLedgerFiltersSchema, filters);
    const conditions: SQL[] = [];
    if (parsed.itemId) {
      conditions.push(eq(inventoryStockLedger.item_id, parsed.itemId));
    }
    if (parsed.warehouseId) {
      conditions.push(eq(inventoryStockLedger.warehouse_id, parsed.warehouseId));
    }
    if (parsed.batchNo) {
      conditions.push(eq(inventoryStockLedger.batch_no, parsed.batchNo));
    }
    if (parsed.serialNo) {
      conditions.push(eq(inventoryStockLedger.serial_no, parsed.serialNo));
    }
    if (parsed.voucherId) {
      conditions.push(eq(inventoryStockLedger.voucher_id, parsed.voucherId));
    }
    const { limit, offset } = paginationOf(parsed);
    const rows = await ctx.db
      .select()
      .from(inventoryStockLedger)
      .where(whereFrom(conditions))
      .limit(limit)
      .offset(offset);
    return rows;
  });

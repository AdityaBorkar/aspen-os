import { inventoryAdditionalCost } from "#/db-schemas/additional-cost";
import { inventoryStockEntry } from "#/db-schemas/stock-entry";
import { inventoryStockEntryItem } from "#/db-schemas/stock-entry-item";
import { inventoryStockLedger } from "#/db-schemas/stock-ledger";
import { PUTAWAY_EVENTS, STOCK_ENTRY_EVENTS, STOCK_EVENTS } from "#/pubsub";
import { toDateOnly } from "#/services/stock-math";
import { submitEntry } from "#/services/stock-posting";
import { IdSchema, SubmitStockEntrySchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchStockEntryStep } from "#/workflow-steps/fetch-inventory";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

export const getStockEntry = Workflow.name("inventory.stock-entry.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const entry = await ctx.step.run(fetchStockEntryStep, { id: input.id });
    const [items, costs] = await Promise.all([
      ctx.db
        .select()
        .from(inventoryStockEntryItem)
        .where(eq(inventoryStockEntryItem.stock_entry_id, input.id)),
      ctx.db
        .select()
        .from(inventoryAdditionalCost)
        .where(eq(inventoryAdditionalCost.stock_entry_id, input.id)),
    ]);
    return { costs, entry, items };
  });

export const submitStockEntry = Workflow.name("inventory.stock-entry.submit")
  .input(object({ input: SubmitStockEntrySchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SubmitStockEntrySchema, input);
    const result = await ctx.step.run("submit-entry", async () =>
      submitEntry(ctx.db, parsed.id, parsed.actorRole ?? null),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SUBMITTED,
        crudAction: "update",
        entityId: parsed.id,
        entityType: AUDIT_ENTITY_TYPE.STOCK_ENTRY,
        newState: { id: parsed.id, purpose: result.entry.purpose, status: "submitted" },
      });
      const costs = await ctx.db
        .select()
        .from(inventoryAdditionalCost)
        .where(eq(inventoryAdditionalCost.stock_entry_id, parsed.id));
      await ctx.pubsub.publish(STOCK_ENTRY_EVENTS.SUBMITTED, {
        additionalCostTotal: costs.reduce((sum, cost) => sum + (cost.amount ?? 0), 0),
        postingDate: toDateOnly(result.entry.posting_date),
        purpose: result.entry.purpose,
        stockEntryId: parsed.id,
      });
      if (result.computed.putawaySplits.length > 0) {
        await ctx.pubsub.publish(PUTAWAY_EVENTS.APPLIED, {
          splits: result.computed.putawaySplits,
          stockEntryId: parsed.id,
        });
      }
      const legs = await ctx.db
        .select()
        .from(inventoryStockLedger)
        .where(
          and(
            eq(inventoryStockLedger.voucher_type, "stock_entry"),
            eq(inventoryStockLedger.voucher_id, parsed.id),
          ),
        );
      await Promise.all(
        legs.map((leg) =>
          ctx.pubsub.publish(STOCK_EVENTS.CHANGED, {
            batchNo: leg.batch_no ?? undefined,
            isTransitLeg: result.entry.add_to_transit,
            itemId: leg.item_id,
            postingDate: leg.posting_date,
            qtyDelta: leg.qty_delta,
            valuationRate: leg.valuation_rate,
            voucherId: parsed.id,
            voucherType: "stock_entry",
            warehouseId: leg.warehouse_id,
          }),
        ),
      );
    });

    const [entry] = await ctx.db
      .select()
      .from(inventoryStockEntry)
      .where(eq(inventoryStockEntry.id, parsed.id))
      .limit(1);
    return { applied: result.applied, entry };
  });

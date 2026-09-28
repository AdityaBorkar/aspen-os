import { inventoryAdditionalCost } from "#/db-schemas/additional-cost";
import { inventoryStockEntry } from "#/db-schemas/stock-entry";
import { inventoryStockEntryItem } from "#/db-schemas/stock-entry-item";
import { STOCK_ENTRY_EVENTS, STOCK_EVENTS, PUTAWAY_EVENTS } from "#/pubsub";
import { toDateOnly } from "#/services/stock-math";
import { applyPosting, computePosting, prepareSubmit } from "#/services/stock-posting";
import { IdSchema, SubmitStockEntrySchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchStockEntryStep } from "#/workflow-steps/fetch-inventory";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

export const getStockEntry = Workflow.name("inventory.stock-entry.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const entry = await ctx.step.run(fetchStockEntryStep, { id: input.id });
    const items = await ctx.db
      .select()
      .from(inventoryStockEntryItem)
      .where(eq(inventoryStockEntryItem.stock_entry_id, input.id));
    const costs = await ctx.db
      .select()
      .from(inventoryAdditionalCost)
      .where(eq(inventoryAdditionalCost.stock_entry_id, input.id));
    return { costs, entry, items };
  });

export const submitStockEntry = Workflow.name("inventory.stock-entry.submit")
  .input(object({ input: SubmitStockEntrySchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SubmitStockEntrySchema, input);
    const prepared = await ctx.step.run("prepare-submit", async () =>
      prepareSubmit(ctx.db, parsed.id, parsed.actorRole ?? null),
    );
    const computed = await ctx.step.run("compute-posting", async () =>
      computePosting(ctx.db, prepared),
    );
    const applied = await ctx.step.run("apply-posting", async () =>
      applyPosting(ctx.db, {
        autoReserve: prepared.setting.autoReserveOnPurchase,
        computed,
        entry: prepared.entry,
      }),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SUBMITTED,
        crudAction: "update",
        entityId: prepared.entry.id,
        entityType: AUDIT_ENTITY_TYPE.STOCK_ENTRY,
        newState: { id: prepared.entry.id, purpose: prepared.entry.purpose, status: "submitted" },
      });
      await ctx.pubsub.publish(STOCK_ENTRY_EVENTS.SUBMITTED, {
        additionalCostTotal: prepared.costs.reduce((sum, cost) => sum + (cost.amount ?? 0), 0),
        postingDate: toDateOnly(prepared.entry.posting_date),
        purpose: prepared.entry.purpose,
        stockEntryId: prepared.entry.id,
      });
      if (computed.putawaySplits.length > 0) {
        await ctx.pubsub.publish(PUTAWAY_EVENTS.APPLIED, {
          splits: computed.putawaySplits,
          stockEntryId: prepared.entry.id,
        });
      }
      // oxlint-disable eslint/no-await-in-loop
      for (const leg of computed.legs) {
        await ctx.pubsub.publish(STOCK_EVENTS.CHANGED, {
          batchNo: leg.batchNo ?? undefined,
          isTransitLeg: prepared.entry.add_to_transit,
          itemId: leg.itemId,
          postingDate: toDateOnly(prepared.entry.posting_date),
          qtyDelta: leg.movement === "in" ? leg.qty : -leg.qty,
          valuationRate: leg.rate,
          voucherId: prepared.entry.id,
          voucherType: "stock_entry",
          warehouseId: leg.warehouseId,
        });
      }
      // oxlint-enable eslint/no-await-in-loop
    });

    const [entry] = await ctx.db
      .select()
      .from(inventoryStockEntry)
      .where(eq(inventoryStockEntry.id, prepared.entry.id))
      .limit(1);
    return { applied, computed: { putawaySplits: computed.putawaySplits }, entry };
  });

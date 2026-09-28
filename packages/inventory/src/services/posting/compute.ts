import { inventoryPutawayRule } from "#/db-schemas/putaway-rule";
import { expandRowsToLegs, validateLegWarehouses } from "#/services/posting/legs";
import type { PricedLeg } from "#/services/posting/legs";
import { priceIssueLegs, priceReceiptLegs } from "#/services/posting/pricing";
import type { PreparedSubmit } from "#/services/posting/types";
import { splitAcrossWarehouses } from "#/services/stock-math";
import { getStockStates } from "#/services/stock-service";
import type { DbOrTx } from "#/services/stock-service";

import { and, eq } from "drizzle-orm";

export interface ComputedPosting {
  legs: PricedLeg[];
  putawaySplits: { itemId: string; qty: number; warehouseId: string }[];
}

async function applyPutawayToReceipts(
  db: DbOrTx,
  receiptLegs: PricedLeg[],
  entry: PreparedSubmit["entry"],
): Promise<{ extraLegs: PricedLeg[]; splits: ComputedPosting["putawaySplits"] }> {
  const splits: ComputedPosting["putawaySplits"] = [];
  const extraLegs: PricedLeg[] = [];
  if (!entry.apply_putaway_rule || receiptLegs.length === 0) {
    return { extraLegs, splits };
  }
  const putawayLegs = receiptLegs.filter((leg) => !leg.isSample);
  for (const leg of putawayLegs) {
    const rules = await db
      .select()
      .from(inventoryPutawayRule)
      .where(
        and(
          eq(inventoryPutawayRule.item_id, leg.itemId),
          eq(inventoryPutawayRule.is_disabled, false),
        ),
      )
      .orderBy(inventoryPutawayRule.priority);
    if (rules.length === 0) {
      continue;
    }
    const states = await getStockStates(
      db,
      rules.map((rule) => ({ itemId: leg.itemId, warehouseId: rule.warehouse_id })),
    );
    const capacities = rules.map((rule) => {
      const onHand = states.get(`${leg.itemId}::${rule.warehouse_id}`)?.onHand ?? 0;
      return { capacity: rule.capacity - onHand, warehouseId: rule.warehouse_id };
    });
    const putawaySplits = splitAcrossWarehouses(leg.qty, capacities);
    if (putawaySplits.length === 1 && putawaySplits[0]?.warehouseId === leg.warehouseId) {
      continue;
    }
    const [first] = putawaySplits;
    if (!first) {
      throw new Error("Putaway split produced no target warehouse.");
    }
    for (const split of putawaySplits) {
      splits.push({ itemId: leg.itemId, qty: split.qty, warehouseId: split.warehouseId });
    }
    leg.warehouseId = first.warehouseId;
    leg.qty = first.qty;
    for (const extra of putawaySplits.slice(1)) {
      extraLegs.push({ ...leg, qty: extra.qty, warehouseId: extra.warehouseId });
    }
  }
  return { extraLegs, splits };
}

export async function computePosting(
  db: DbOrTx,
  prepared: PreparedSubmit,
): Promise<ComputedPosting> {
  const { costs, entry, items, setting } = prepared;
  const unpriced = expandRowsToLegs(items, entry, setting);
  await validateLegWarehouses(db, unpriced, entry);
  const pricedIssues = await priceIssueLegs(db, unpriced, entry);
  const receiptUnpriced = unpriced.filter((leg) => leg.movement === "in");
  const receiptLegs: PricedLeg[] = receiptUnpriced.map((leg) => ({ ...leg, rate: leg.basicRate }));
  const totalAdditional = costs.reduce((sum, cost) => sum + (cost.amount ?? 0), 0);
  priceReceiptLegs(pricedIssues, receiptLegs, totalAdditional, entry);
  const { extraLegs, splits } = await applyPutawayToReceipts(db, receiptLegs, entry);
  const legs = [...pricedIssues, ...receiptLegs, ...extraLegs];
  return { legs, putawaySplits: splits };
}

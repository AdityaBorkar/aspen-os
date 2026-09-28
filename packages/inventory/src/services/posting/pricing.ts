import { isRollupPurpose, resolveIssueAllowance } from "#/services/posting/legs";
import type { PricedLeg, UnpricedLeg } from "#/services/posting/legs";
import { assertBatchIssuable, assertSerialsAvailable } from "#/services/posting/stock-checks";
import type { StockEntryRow } from "#/services/posting/types";
import { distributeAdditionalCosts, fifoIssueRate, toDateOnly } from "#/services/stock-math";
import {
  getLatestValuationRate,
  getOldestReceiptRate,
  getStockStates,
} from "#/services/stock-service";
import type { DbOrTx } from "#/services/stock-service";
import { VALUATION_METHOD } from "#/utils/constants";

export async function priceIssueLegs(
  db: DbOrTx,
  legs: UnpricedLeg[],
  entry: StockEntryRow,
): Promise<PricedLeg[]> {
  const issueLegs = legs.filter((leg) => leg.movement === "out");
  if (issueLegs.length === 0) {
    return [];
  }
  const states = await getStockStates(
    db,
    issueLegs.map((leg) => ({ itemId: leg.itemId, warehouseId: leg.warehouseId })),
  );
  const priced: PricedLeg[] = [];
  for (const leg of issueLegs) {
    const key = `${leg.itemId}::${leg.warehouseId}`;
    const state = states.get(key) ?? { available: 0, onHand: 0, reserved: 0, value: 0 };
    const currentAvg = state.onHand > 0 ? state.value / state.onHand : 0;
    let rate: number;
    if (leg.valuationMethod === VALUATION_METHOD.FIFO) {
      const oldest = await getOldestReceiptRate(db, leg.itemId, leg.warehouseId);
      const latest = await getLatestValuationRate(db, leg.itemId, leg.warehouseId);
      rate = fifoIssueRate(oldest, latest ?? currentAvg);
    } else if (currentAvg > 0) {
      rate = currentAvg;
    } else {
      rate = (await getLatestValuationRate(db, leg.itemId, leg.warehouseId)) ?? 0;
    }
    const allowNegative = resolveIssueAllowance(entry, leg);
    if (leg.isSerialTracked || leg.batchNo) {
      if (state.onHand - leg.qty < 0) {
        throw new Error(
          `Insufficient stock for serial/batch item "${leg.itemId}" (negative stock is never allowed).`,
        );
      }
    } else if (!allowNegative && state.available - leg.qty < 0) {
      throw new Error(
        `Insufficient stock for item "${leg.itemId}" in warehouse "${leg.warehouseId}".`,
      );
    }
    priced.push({ ...leg, rate });
  }
  for (const leg of priced) {
    if (leg.batchNo !== null) {
      await assertBatchIssuable(db, {
        batchNo: leg.batchNo,
        itemId: leg.itemId,
        postingDateOnly: toDateOnly(entry.posting_date),
        qty: leg.qty,
        warehouseId: leg.warehouseId,
      });
    }
  }
  const serialLegs = priced.filter((leg) => leg.isSerialTracked);
  if (serialLegs.length > 0) {
    await assertSerialsAvailable(db, {
      items: serialLegs.map((leg) => ({
        itemId: leg.itemId,
        serialNos: leg.serialNos,
        warehouseId: leg.warehouseId,
      })),
    });
  }
  return priced;
}

function applyStandardReceiptRates(receiptLegs: PricedLeg[], totalAdditional: number): void {
  const basicAmounts = receiptLegs.map((leg) => leg.qty * leg.basicRate);
  const shares = distributeAdditionalCosts(basicAmounts, totalAdditional);
  receiptLegs.forEach((leg, index) => {
    const share = shares[index] ?? 0;
    leg.rate = leg.basicRate + (leg.qty > 0 ? share / leg.qty : 0);
  });
}

function applyRollupReceiptRates(
  issueLegs: PricedLeg[],
  receiptLegs: PricedLeg[],
  totalAdditional: number,
): void {
  const inputValue = issueLegs.reduce((sum, leg) => sum + leg.qty * leg.rate, 0) + totalAdditional;
  const issuedQty = new Map<string, number>();
  const issuedValue = new Map<string, number>();
  for (const leg of issueLegs) {
    issuedQty.set(leg.itemId, (issuedQty.get(leg.itemId) ?? 0) + leg.qty);
    issuedValue.set(leg.itemId, (issuedValue.get(leg.itemId) ?? 0) + leg.qty * leg.rate);
  }
  const newReceipts = receiptLegs.filter((leg) => !issuedQty.has(leg.itemId));
  let transferValue = 0;
  for (const leg of receiptLegs) {
    const qty = issuedQty.get(leg.itemId) ?? 0;
    if (qty <= 0) {
      continue;
    }
    const value = issuedValue.get(leg.itemId) ?? 0;
    leg.rate = qty > 0 ? value / qty : 0;
    transferValue += leg.qty * leg.rate;
  }
  const remaining = inputValue - transferValue;
  const weights = newReceipts.map((leg) => (leg.basicRate > 0 ? leg.qty * leg.basicRate : leg.qty));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  newReceipts.forEach((leg, index) => {
    const weight = weights[index] ?? 0;
    const share =
      weightTotal > 0 ? (weight / weightTotal) * remaining : remaining / newReceipts.length;
    leg.rate = leg.qty > 0 ? share / leg.qty : 0;
  });
}

export function priceReceiptLegs(
  issueLegs: PricedLeg[],
  receiptLegs: PricedLeg[],
  totalAdditional: number,
  entry: StockEntryRow,
): void {
  if (isRollupPurpose(entry.purpose) && issueLegs.length > 0 && receiptLegs.length > 0) {
    applyRollupReceiptRates(issueLegs, receiptLegs, totalAdditional);
    return;
  }
  applyStandardReceiptRates(receiptLegs, totalAdditional);
}

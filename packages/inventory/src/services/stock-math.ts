import { STOCK_ENTRY_PURPOSE } from "#/utils/constants";
import type { StockEntryPurpose } from "#/utils/constants";

interface PurposeWarehouseRule {
  needsSource: boolean;
  needsTarget: boolean;
}

const PURPOSE_WAREHOUSE_RULES = {
  [STOCK_ENTRY_PURPOSE.MATERIAL_ISSUE]: { needsSource: true, needsTarget: false },
  [STOCK_ENTRY_PURPOSE.MATERIAL_RECEIPT]: { needsSource: false, needsTarget: true },
  [STOCK_ENTRY_PURPOSE.MATERIAL_TRANSFER]: { needsSource: true, needsTarget: true },
  [STOCK_ENTRY_PURPOSE.TRANSFER_FOR_MANUFACTURE]: { needsSource: true, needsTarget: true },
  [STOCK_ENTRY_PURPOSE.CONSUMPTION_FOR_MANUFACTURE]: { needsSource: true, needsTarget: false },
  [STOCK_ENTRY_PURPOSE.MANUFACTURE]: { needsSource: false, needsTarget: true },
  [STOCK_ENTRY_PURPOSE.REPACK]: { needsSource: true, needsTarget: true },
  [STOCK_ENTRY_PURPOSE.SEND_TO_SUBCONTRACTOR]: { needsSource: true, needsTarget: false },
  [STOCK_ENTRY_PURPOSE.CUSTOMER_PROVIDED_RECEIPT]: { needsSource: false, needsTarget: true },
} satisfies Record<StockEntryPurpose, PurposeWarehouseRule>;

export function getPurposeWarehouseRule(purpose: StockEntryPurpose): PurposeWarehouseRule {
  const rule = PURPOSE_WAREHOUSE_RULES[purpose];
  if (!rule) {
    throw new Error(`Unknown stock entry purpose "${purpose}".`);
  }
  return rule;
}

export function validateHeaderWarehouses(
  purpose: StockEntryPurpose,
  sourceWarehouseId: string | null,
  targetWarehouseId: string | null,
): void {
  if (
    sourceWarehouseId &&
    targetWarehouseId &&
    sourceWarehouseId === targetWarehouseId &&
    purpose !== STOCK_ENTRY_PURPOSE.REPACK
  ) {
    throw new Error("Source and target warehouses must differ.");
  }
}

export interface RowLegRule {
  allowIn: boolean;
  allowOut: boolean;
}

export function getRowLegRule(purpose: StockEntryPurpose): RowLegRule {
  switch (purpose) {
    case STOCK_ENTRY_PURPOSE.MATERIAL_ISSUE:
    case STOCK_ENTRY_PURPOSE.CONSUMPTION_FOR_MANUFACTURE:
    case STOCK_ENTRY_PURPOSE.SEND_TO_SUBCONTRACTOR: {
      return { allowIn: false, allowOut: true };
    }
    case STOCK_ENTRY_PURPOSE.MATERIAL_RECEIPT:
    case STOCK_ENTRY_PURPOSE.CUSTOMER_PROVIDED_RECEIPT: {
      return { allowIn: true, allowOut: false };
    }
    case STOCK_ENTRY_PURPOSE.MATERIAL_TRANSFER:
    case STOCK_ENTRY_PURPOSE.TRANSFER_FOR_MANUFACTURE:
    case STOCK_ENTRY_PURPOSE.MANUFACTURE:
    case STOCK_ENTRY_PURPOSE.REPACK: {
      return { allowIn: true, allowOut: true };
    }
  }
}

export function validateRowLegs(
  purpose: StockEntryPurpose,
  sourceWarehouseId: string | null,
  targetWarehouseId: string | null,
): void {
  const rule = getRowLegRule(purpose);
  if (!sourceWarehouseId && !targetWarehouseId) {
    throw new Error(
      `Purpose "${purpose}" rows need a source warehouse, a target warehouse, or both.`,
    );
  }
  if (sourceWarehouseId && !rule.allowOut) {
    throw new Error(`Purpose "${purpose}" rows must not carry a source warehouse.`);
  }
  if (targetWarehouseId && !rule.allowIn) {
    throw new Error(`Purpose "${purpose}" rows must not carry a target warehouse.`);
  }
  if (
    sourceWarehouseId &&
    targetWarehouseId &&
    sourceWarehouseId === targetWarehouseId &&
    purpose !== STOCK_ENTRY_PURPOSE.REPACK
  ) {
    throw new Error("Source and target warehouses must differ.");
  }
}

export function validatePurposeWarehouses(
  purpose: StockEntryPurpose,
  sourceWarehouseId: string | null,
  targetWarehouseId: string | null,
): void {
  const rule = getPurposeWarehouseRule(purpose);
  if (rule.needsSource && !sourceWarehouseId) {
    throw new Error(`Purpose "${purpose}" requires a source warehouse.`);
  }
  if (!rule.needsSource && sourceWarehouseId && purpose !== STOCK_ENTRY_PURPOSE.MANUFACTURE) {
    throw new Error(`Purpose "${purpose}" must not carry a source warehouse.`);
  }
  if (rule.needsTarget && !targetWarehouseId) {
    throw new Error(`Purpose "${purpose}" requires a target warehouse.`);
  }
  if (!rule.needsTarget && targetWarehouseId) {
    throw new Error(`Purpose "${purpose}" must not carry a target warehouse.`);
  }
  validateHeaderWarehouses(purpose, sourceWarehouseId, targetWarehouseId);
}

export function distributeAdditionalCosts(basicAmounts: number[], totalCost: number): number[] {
  const total = basicAmounts.reduce((sum, amount) => sum + amount, 0);
  if (total <= 0 || totalCost <= 0) {
    return basicAmounts.map(() => 0);
  }
  return basicAmounts.map((amount) => (amount / total) * totalCost);
}

// oxlint-disable-next-line eslint/max-params -- weighted-average needs all four operands; an options object would obscure the formula
export function movingAverageRate(
  onHandQty: number,
  onHandValue: number,
  receiptQty: number,
  receiptRate: number,
): number {
  const qty = onHandQty + receiptQty;
  if (qty <= 0) {
    return receiptRate;
  }
  return (onHandValue + receiptQty * receiptRate) / qty;
}

export function fifoIssueRate(oldestReceiptRate: number | null, fallbackRate: number): number {
  if (oldestReceiptRate === null || oldestReceiptRate <= 0) {
    return fallbackRate;
  }
  return oldestReceiptRate;
}

export interface PutawayCapacity {
  free: number;
  warehouseId: string;
}

export interface PutawaySplit {
  qty: number;
  warehouseId: string;
}

export function splitAcrossWarehouses(qty: number, capacities: PutawayCapacity[]): PutawaySplit[] {
  let remaining = qty;
  const splits: PutawaySplit[] = [];
  for (const capacity of capacities) {
    if (remaining <= 0) {
      break;
    }
    const take = Math.min(remaining, Math.max(capacity.free, 0));
    if (take > 0) {
      splits.push({ qty: take, warehouseId: capacity.warehouseId });
      remaining -= take;
    }
  }
  if (remaining > 0) {
    throw new Error(`Putaway capacity exhausted with ${remaining} units unassigned.`);
  }
  return splits;
}

export function toDateOnly(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const [iso] = date.toISOString().split("T");
  if (!iso) {
    throw new Error(`Cannot convert "${String(value)}" to a date.`);
  }
  return iso;
}

export function daysBetween(fromDateOnly: string, toDateOnlyValue: string): number {
  const from = new Date(`${fromDateOnly}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDateOnlyValue}T00:00:00.000Z`).getTime();
  return Math.floor((to - from) / 86_400_000);
}

// oxlint-disable-next-line eslint/max-params -- freeze check reads three independent window settings; grouping would hide the guard logic
export function isFrozen(
  postingDateOnly: string,
  freezeUptoDate: string | null,
  freezeOlderThanDays: number | null,
  todayOnly: string,
): boolean {
  if (freezeUptoDate && postingDateOnly <= freezeUptoDate) {
    return true;
  }
  if (freezeOlderThanDays !== null && freezeOlderThanDays >= 0) {
    const age = daysBetween(postingDateOnly, todayOnly);
    if (age > freezeOlderThanDays) {
      return true;
    }
  }
  return false;
}

export function availableQty(onHand: number, reserved: number): number {
  return onHand - reserved;
}

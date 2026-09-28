import { STOCK_ENTRY_PURPOSE } from "#/utils/constants";
import type { StockEntryPurpose } from "#/utils/constants";

interface PurposeLegality {
  allowIn: boolean;
  allowOut: boolean;
  needsSource: boolean;
  needsTarget: boolean;
}

const PURPOSE_LEGALITY = {
  [STOCK_ENTRY_PURPOSE.MATERIAL_ISSUE]: {
    allowIn: false,
    allowOut: true,
    needsSource: true,
    needsTarget: false,
  },
  [STOCK_ENTRY_PURPOSE.MATERIAL_RECEIPT]: {
    allowIn: true,
    allowOut: false,
    needsSource: false,
    needsTarget: true,
  },
  [STOCK_ENTRY_PURPOSE.MATERIAL_TRANSFER]: {
    allowIn: true,
    allowOut: true,
    needsSource: true,
    needsTarget: true,
  },
  [STOCK_ENTRY_PURPOSE.TRANSFER_FOR_MANUFACTURE]: {
    allowIn: true,
    allowOut: true,
    needsSource: true,
    needsTarget: true,
  },
  [STOCK_ENTRY_PURPOSE.CONSUMPTION_FOR_MANUFACTURE]: {
    allowIn: false,
    allowOut: true,
    needsSource: true,
    needsTarget: false,
  },
  [STOCK_ENTRY_PURPOSE.MANUFACTURE]: {
    allowIn: true,
    allowOut: true,
    needsSource: false,
    needsTarget: true,
  },
  [STOCK_ENTRY_PURPOSE.REPACK]: {
    allowIn: true,
    allowOut: true,
    needsSource: true,
    needsTarget: true,
  },
  [STOCK_ENTRY_PURPOSE.SEND_TO_SUBCONTRACTOR]: {
    allowIn: false,
    allowOut: true,
    needsSource: true,
    needsTarget: false,
  },
  [STOCK_ENTRY_PURPOSE.CUSTOMER_PROVIDED_RECEIPT]: {
    allowIn: true,
    allowOut: false,
    needsSource: false,
    needsTarget: true,
  },
} satisfies Record<StockEntryPurpose, PurposeLegality>;

export interface PurposeWarehouseRule {
  needsSource: boolean;
  needsTarget: boolean;
}

export function getPurposeWarehouseRule(purpose: StockEntryPurpose): PurposeWarehouseRule {
  const rule = PURPOSE_LEGALITY[purpose];
  return { needsSource: rule.needsSource, needsTarget: rule.needsTarget };
}

export interface RowLegRule {
  allowIn: boolean;
  allowOut: boolean;
}

export function getRowLegRule(purpose: StockEntryPurpose): RowLegRule {
  const rule = PURPOSE_LEGALITY[purpose];
  return { allowIn: rule.allowIn, allowOut: rule.allowOut };
}

function assertDifferentWarehouses(
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

export function validateHeaderWarehouses(
  purpose: StockEntryPurpose,
  sourceWarehouseId: string | null,
  targetWarehouseId: string | null,
): void {
  const rule = PURPOSE_LEGALITY[purpose];
  if (rule.needsSource && !sourceWarehouseId) {
    throw new Error(`Purpose "${purpose}" requires a source warehouse.`);
  }
  if (rule.needsTarget && !targetWarehouseId) {
    throw new Error(`Purpose "${purpose}" requires a target warehouse.`);
  }
  if (!rule.allowOut && sourceWarehouseId) {
    throw new Error(`Purpose "${purpose}" must not carry a source warehouse.`);
  }
  if (!rule.allowIn && targetWarehouseId) {
    throw new Error(`Purpose "${purpose}" must not carry a target warehouse.`);
  }
  assertDifferentWarehouses(purpose, sourceWarehouseId, targetWarehouseId);
}

export function validateRowLegs(
  purpose: StockEntryPurpose,
  sourceWarehouseId: string | null,
  targetWarehouseId: string | null,
): void {
  const rule = PURPOSE_LEGALITY[purpose];
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
  assertDifferentWarehouses(purpose, sourceWarehouseId, targetWarehouseId);
}

export function validatePurposeWarehouses(
  purpose: StockEntryPurpose,
  sourceWarehouseId: string | null,
  targetWarehouseId: string | null,
): void {
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
  capacity: number | null;
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
    const free = capacity.capacity === null ? Number.POSITIVE_INFINITY : capacity.capacity;
    const take = Math.min(remaining, Math.max(free, 0));
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

export interface FreezeWindow {
  olderThanDays: number | null;
  uptoDate: string | null;
}

// oxlint-disable-next-line eslint/max-params -- freeze check reads three independent window settings; grouping would hide the guard logic
export function isFrozen(
  postingDateOnly: string,
  freezeUptoDate: string | null,
  freezeOlderThanDays: number | null,
  todayOnly: string,
): boolean {
  return isFrozenWindow(
    postingDateOnly,
    { olderThanDays: freezeOlderThanDays, uptoDate: freezeUptoDate },
    todayOnly,
  );
}

export function isFrozenWindow(
  postingDateOnly: string,
  window: FreezeWindow,
  todayOnly: string,
): boolean {
  if (window.uptoDate && postingDateOnly <= window.uptoDate) {
    return true;
  }
  if (window.olderThanDays !== null && window.olderThanDays >= 0) {
    const age = daysBetween(postingDateOnly, todayOnly);
    if (age > window.olderThanDays) {
      return true;
    }
  }
  return false;
}

export function availableQty(onHand: number, reserved: number): number {
  return onHand - reserved;
}

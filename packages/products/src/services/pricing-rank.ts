import type { ProductsItemPrice } from "#/db-schemas/item-price";

export interface ItemPriceKey {
  batchNo: string | null;
  customerId: string | null;
  minQty: number | null;
  supplierId: string | null;
  uom: string;
}

export function rowKey(row: ProductsItemPrice): ItemPriceKey {
  return {
    batchNo: row.batch_no,
    customerId: row.customer_id,
    minQty: row.min_qty,
    supplierId: row.supplier_id,
    uom: row.uom,
  };
}

export function samePriceKey(first: ItemPriceKey, second: ItemPriceKey): boolean {
  return (
    first.uom === second.uom &&
    first.minQty === second.minQty &&
    first.customerId === second.customerId &&
    first.supplierId === second.supplierId &&
    first.batchNo === second.batchNo
  );
}

export function isValidOn(row: ProductsItemPrice, dateKey: string): boolean {
  if (row.valid_from > dateKey) {
    return false;
  }
  if (row.valid_upto !== null && dateKey > row.valid_upto) {
    return false;
  }
  return true;
}

export interface ValidityRange {
  from: string;
  upto: string | null;
}

/** Open-ended ranges sort after every concrete date without a magic end-date string. */
const OPEN_ENDED_UPTO = "9999-12-31";

export function validityOverlaps(first: ValidityRange, second: ValidityRange): boolean {
  const firstEnd = first.upto ?? OPEN_ENDED_UPTO;
  const secondEnd = second.upto ?? OPEN_ENDED_UPTO;
  return first.from <= secondEnd && second.from <= firstEnd;
}

export interface OverlapQuery {
  excludeId?: string;
  key: ItemPriceKey;
  range: ValidityRange;
}

export function findOverlappingRow(
  rows: ProductsItemPrice[],
  query: OverlapQuery,
): ProductsItemPrice | null {
  for (const row of rows) {
    if (row.status !== "active" && row.status !== "draft") {
      continue;
    }
    if (query.excludeId !== undefined && row.id === query.excludeId) {
      continue;
    }
    if (!samePriceKey(rowKey(row), query.key)) {
      continue;
    }
    if (validityOverlaps({ from: row.valid_from, upto: row.valid_upto }, query.range)) {
      return row;
    }
  }
  return null;
}

export interface RankRequest {
  batchNo: string | null;
  customerId: string | null;
  dateKey: string;
  qty: number;
  supplierId: string | null;
  uom: string;
}

function specificityScore(row: ProductsItemPrice, request: RankRequest): number {
  const partyMatch =
    (row.customer_id !== null && row.customer_id === request.customerId) ||
    (row.supplier_id !== null && row.supplier_id === request.supplierId);
  const batchMatch = row.batch_no !== null && row.batch_no === request.batchNo;
  if (partyMatch && batchMatch) {
    return 4;
  }
  if (partyMatch) {
    return 3;
  }
  if (batchMatch) {
    return 2;
  }
  return 1;
}

interface ScoredCandidate {
  row: ProductsItemPrice;
  score: number;
}

function compareRanked(first: ScoredCandidate, second: ScoredCandidate): number {
  if (first.score !== second.score) {
    return second.score - first.score;
  }
  const firstMin = first.row.min_qty ?? -1;
  const secondMin = second.row.min_qty ?? -1;
  if (firstMin !== secondMin) {
    return secondMin - firstMin;
  }
  if (first.row.valid_from !== second.row.valid_from) {
    return first.row.valid_from > second.row.valid_from ? -1 : 1;
  }
  // Null lead time sorts after every concrete value without a magic-number sentinel.
  const firstLead = first.row.lead_time_days ?? Number.POSITIVE_INFINITY;
  const secondLead = second.row.lead_time_days ?? Number.POSITIVE_INFINITY;
  if (firstLead !== secondLead) {
    return firstLead - secondLead;
  }
  if (first.row.created_at.getTime() !== second.row.created_at.getTime()) {
    return first.row.created_at < second.row.created_at ? -1 : 1;
  }
  if (first.row.id === second.row.id) {
    return 0;
  }
  return first.row.id < second.row.id ? -1 : 1;
}

function isThresholdEligible(row: ProductsItemPrice, request: RankRequest): boolean {
  if (row.status !== "active") {
    return false;
  }
  if (!isValidOn(row, request.dateKey)) {
    return false;
  }
  if (row.min_qty !== null && row.min_qty > request.qty) {
    return false;
  }
  if (row.customer_id !== null && row.customer_id !== request.customerId) {
    return false;
  }
  if (row.supplier_id !== null && row.supplier_id !== request.supplierId) {
    return false;
  }
  if (row.batch_no !== null && row.batch_no !== request.batchNo) {
    return false;
  }
  return true;
}

export function rankItemPriceCandidates(
  rows: ProductsItemPrice[],
  request: RankRequest,
): ProductsItemPrice[] {
  const eligible = rows.filter(
    (row) => row.uom === request.uom && isThresholdEligible(row, request),
  );
  const scored: ScoredCandidate[] = eligible.map((row) => ({
    row,
    score: specificityScore(row, request),
  }));
  scored.sort((first, second) => compareRanked(first, second));
  return scored.map((entry) => entry.row);
}

export interface ConvertedCandidate {
  convertedRate: number;
  row: ProductsItemPrice;
}

export function rankConvertibleCandidates(
  rows: ProductsItemPrice[],
  request: RankRequest,
  resolveFactor: (uom: string) => number | null,
): ConvertedCandidate[] {
  const txnFactor = resolveFactor(request.uom);
  if (txnFactor === null) {
    return [];
  }
  const scored: (ConvertedCandidate & { score: number })[] = [];
  for (const row of rows) {
    if (row.uom === request.uom) {
      continue;
    }
    if (!isThresholdEligible(row, request)) {
      continue;
    }
    const rowFactor = resolveFactor(row.uom);
    if (rowFactor === null || rowFactor === 0) {
      continue;
    }
    scored.push({
      convertedRate: (row.rate * txnFactor) / rowFactor,
      row,
      score: specificityScore(row, request),
    });
  }
  scored.sort((first, second) => compareRanked(first, second));
  return scored.map(({ convertedRate, row }) => ({ convertedRate, row }));
}

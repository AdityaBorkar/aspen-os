import type { ProductsItemPrice } from "#/db-schemas/item-price";

export function isValidOn(row: ProductsItemPrice, dateKey: string): boolean {
  if (row.valid_from > dateKey) {
    return false;
  }
  if (row.valid_upto !== null && dateKey > row.valid_upto) {
    return false;
  }
  return true;
}

export interface OverlapFilter {
  batchNo: string | null;
  customerId: string | null;
  excludeId?: string;
  from: string;
  minQty: number | null;
  supplierId: string | null;
  uom: string;
  upto: string | null;
}

export function findOverlappingRow(
  rows: ProductsItemPrice[],
  filter: OverlapFilter,
): ProductsItemPrice | null {
  const filterEnd = filter.upto ?? "9999-12-31";
  for (const row of rows) {
    if (row.status !== "active" && row.status !== "draft") {
      continue;
    }
    if (filter.excludeId !== undefined && row.id === filter.excludeId) {
      continue;
    }
    if (
      row.uom !== filter.uom ||
      row.min_qty !== filter.minQty ||
      row.customer_id !== filter.customerId ||
      row.supplier_id !== filter.supplierId ||
      row.batch_no !== filter.batchNo
    ) {
      continue;
    }
    const rowEnd = row.valid_upto ?? "9999-12-31";
    if (row.valid_from <= filterEnd && filter.from <= rowEnd) {
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

type RankKey = readonly [number, number, string, number, number, string];

function compareRankKey(first: RankKey, second: RankKey): number {
  if (first[0] !== second[0]) {
    return second[0] - first[0];
  }
  if (first[1] !== second[1]) {
    return second[1] - first[1];
  }
  if (first[2] !== second[2]) {
    return first[2] > second[2] ? -1 : 1;
  }
  if (first[3] !== second[3]) {
    return first[3] - second[3];
  }
  if (first[4] !== second[4]) {
    return first[4] < second[4] ? -1 : 1;
  }
  if (first[5] !== second[5]) {
    return first[5] < second[5] ? -1 : 1;
  }
  return 0;
}

function rankKey(row: ProductsItemPrice, request: RankRequest): RankKey {
  const partyMatch =
    (row.customer_id !== null && row.customer_id === request.customerId) ||
    (row.supplier_id !== null && row.supplier_id === request.supplierId);
  const batchMatch = row.batch_no !== null && row.batch_no === request.batchNo;
  const specificity = partyMatch && batchMatch ? 4 : partyMatch ? 3 : batchMatch ? 2 : 1;
  return [
    specificity,
    row.min_qty ?? -1,
    row.valid_from,
    row.lead_time_days ?? Number.POSITIVE_INFINITY,
    row.created_at.getTime(),
    row.id,
  ];
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

function sortByRank(rows: ProductsItemPrice[], request: RankRequest): ProductsItemPrice[] {
  const keyed = rows.map((row) => ({ key: rankKey(row, request), row }));
  keyed.sort((first, second) => compareRankKey(first.key, second.key));
  return keyed.map((entry) => entry.row);
}

export interface ConvertedCandidate {
  convertedRate: number;
  row: ProductsItemPrice;
}

export function rankCandidates(
  rows: ProductsItemPrice[],
  request: RankRequest,
  options: { convert: (uom: string) => number | null; includeUom: "convertible" },
): ConvertedCandidate[];
export function rankCandidates(
  rows: ProductsItemPrice[],
  request: RankRequest,
  options: { includeUom: "same" },
): ProductsItemPrice[];
export function rankCandidates(
  rows: ProductsItemPrice[],
  request: RankRequest,
  options: { convert?: (uom: string) => number | null; includeUom: "same" | "convertible" },
): ProductsItemPrice[] | ConvertedCandidate[] {
  if (options.includeUom === "same") {
    return sortByRank(
      rows.filter((row) => row.uom === request.uom && isThresholdEligible(row, request)),
      request,
    );
  }
  const { convert } = options;
  if (convert === undefined) {
    throw new Error('convert is required when includeUom is "convertible".');
  }
  const txnFactor = convert(request.uom);
  if (txnFactor === null) {
    return [];
  }
  const scored: (ConvertedCandidate & { key: RankKey })[] = [];
  for (const row of rows) {
    if (row.uom === request.uom) {
      continue;
    }
    if (!isThresholdEligible(row, request)) {
      continue;
    }
    const rowFactor = convert(row.uom);
    if (rowFactor === null || rowFactor === 0) {
      continue;
    }
    scored.push({
      convertedRate: (row.rate * txnFactor) / rowFactor,
      key: rankKey(row, request),
      row,
    });
  }
  scored.sort((first, second) => compareRankKey(first.key, second.key));
  return scored.map(({ convertedRate, row }) => ({ convertedRate, row }));
}

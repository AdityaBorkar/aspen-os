import { clampListLimit, clampListOffset } from "#/utils/constants";

export interface ListPaginationInput {
  limit?: number;
  offset?: number;
}

/**
 * Clamped pagination for every list workflow. Callers keep their concrete
 * drizzle queries (which stay fully typed); this only guarantees no list can
 * return an unbounded full-table scan.
 */
export function listPagination(filters?: ListPaginationInput) {
  return { limit: clampListLimit(filters?.limit), offset: clampListOffset(filters?.offset) };
}

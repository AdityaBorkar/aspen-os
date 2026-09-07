import { FileViewSortSchema } from "#/schemas/file-view";

import { array, date, number, object, optional, picklist, string } from "valibot";
import type { InferOutput } from "valibot";

export const SearchScopeSchema = picklist(["all", "my_files", "shared_with_me"]);

export const SearchSortOrderSchema = picklist(["asc", "desc"]);

export const DateRangeSchema = object({
  end: optional(string()),
  start: optional(string()),
});

export const SizeRangeSchema = object({
  max: optional(number()),
  min: optional(number()),
});

export const SearchOptionsSchema = object({
  classId: optional(string()),
  contentType: optional(string()),
  /**
   * @deprecated Use `dateRange` instead. When both are present, `dateRange` wins.
   */
  dateFrom: optional(date()),
  dateRange: optional(DateRangeSchema),
  /**
   * @deprecated Use `dateRange` instead. When both are present, `dateRange` wins.
   */
  dateTo: optional(date()),
  labels: optional(array(string())),
  limit: optional(number(), 50),
  offset: optional(number(), 0),
  /**
   * @deprecated Prefer scoping via `scope` + caller identity. When both are
   * present, explicit `scope` handling wins and `ownerId` is only a hint.
   */
  ownerId: optional(string()),
  scope: optional(string(), "my_files"),
  /**
   * @deprecated Use `sizeRange` instead. When both are present, `sizeRange` wins.
   */
  sizeMax: optional(number()),
  /**
   * @deprecated Use `sizeRange` instead. When both are present, `sizeRange` wins.
   */
  sizeMin: optional(number()),
  sizeRange: optional(SizeRangeSchema),
  sort: optional(array(FileViewSortSchema)),
  status: optional(string()),
});

export type SearchOptions = InferOutput<typeof SearchOptionsSchema>;

/**
 * Normalize deprecated search range fields into their canonical range form.
 * Explicit `dateRange`/`sizeRange` win when both forms are present.
 */
export interface NormalizedSearchRanges {
  dateRange: { end?: string; start?: string } | undefined;
  sizeRange: { max?: number; min?: number } | undefined;
}

export function normalizeSearchRanges(options: SearchOptions): NormalizedSearchRanges {
  const dateRange =
    options.dateRange ??
    ((options.dateFrom ?? options.dateTo)
      ? {
          end: options.dateTo?.toISOString(),
          start: options.dateFrom?.toISOString(),
        }
      : undefined);
  const sizeRange =
    options.sizeRange ??
    ((options.sizeMin ?? options.sizeMax)
      ? { max: options.sizeMax, min: options.sizeMin }
      : undefined);
  return { dateRange, sizeRange };
}

export const QuickSearchSchema = object({
  limit: optional(number(), 10),
  query: string(),
});

export type QuickSearchInput = InferOutput<typeof QuickSearchSchema>;

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
  dateFrom: optional(date()),
  dateRange: optional(DateRangeSchema),
  dateTo: optional(date()),
  labels: optional(array(string())),
  limit: optional(number(), 50),
  offset: optional(number(), 0),
  ownerId: optional(string()),
  scope: optional(string(), "mine"),
  sizeMax: optional(number()),
  sizeMin: optional(number()),
  sizeRange: optional(SizeRangeSchema),
  sort: optional(array(FileViewSortSchema)),
  status: optional(string()),
});

export type SearchOptions = InferOutput<typeof SearchOptionsSchema>;

export const QuickSearchSchema = object({
  limit: optional(number(), 10),
  query: string(),
});

export type QuickSearchInput = InferOutput<typeof QuickSearchSchema>;

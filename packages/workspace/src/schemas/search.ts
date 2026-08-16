import { integer, minLength, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const QuickSearchSchema = object({
  limit: optional(pipe(number(), integer())),
  query: pipe(string(), minLength(1, "Search query is required")),
});

export type QuickSearchInput = InferOutput<typeof QuickSearchSchema>;

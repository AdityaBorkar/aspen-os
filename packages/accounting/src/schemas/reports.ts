import { nullable, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const StatementFiltersSchema = object({
  accountId: optional(nullable(string())),
  fiscalYear: optional(nullable(string())),
  fromDate: optional(nullable(string())),
  partyId: optional(nullable(string())),
  toDate: optional(nullable(string())),
});

export type StatementFilters = InferOutput<typeof StatementFiltersSchema>;

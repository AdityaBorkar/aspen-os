import { number, object, record, string } from "valibot";
import type { InferOutput } from "valibot";

export const SummarySchema = object({
  activeObligations: number(),
  byBranch: record(string(), number()),
  byCategory: record(string(), number()),
  bySourceModule: record(string(), number()),
  byStatus: record(string(), number()),
  documentsGenerated30d: number(),
  dueSoon: number(),
  expired: number(),
  expiringSoon: number(),
  healthScore: number(),
  overdue: number(),
  pendingReview: number(),
  rejected: number(),
  total: number(),
  verified: number(),
});

export type SummaryOutput = InferOutput<typeof SummarySchema>;

/** @deprecated Use SummarySchema — harmonized Dashboard → Summary */
export const DashboardSummarySchema = SummarySchema;
/** @deprecated Use SummaryOutput */
export type DashboardSummaryOutput = SummaryOutput;

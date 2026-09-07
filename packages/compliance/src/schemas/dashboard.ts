import { number, object, record, string } from "valibot";
import type { InferOutput } from "valibot";

export const DashboardSummarySchema = object({
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

export type DashboardSummaryOutput = InferOutput<typeof DashboardSummarySchema>;

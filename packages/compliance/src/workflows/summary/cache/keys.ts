export const SUMMARY_CACHE_KEY = "compliance:summary";
export const DASHBOARD_SUMMARY_CACHE_KEY = SUMMARY_CACHE_KEY;

export function summaryKey(branch?: string): string {
  return branch ? `${SUMMARY_CACHE_KEY}:${branch}` : SUMMARY_CACHE_KEY;
}

/** @deprecated Use summaryKey — harmonized Dashboard → Summary */
export const dashboardSummaryKey = summaryKey;

export function summaryPattern(): string {
  return `${SUMMARY_CACHE_KEY}*`;
}

/** @deprecated Use summaryPattern */
export const dashboardSummaryPattern = summaryPattern;

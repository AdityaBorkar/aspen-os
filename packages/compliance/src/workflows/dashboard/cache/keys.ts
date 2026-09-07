export const DASHBOARD_SUMMARY_CACHE_KEY = "compliance:dashboard:summary";

export function dashboardSummaryKey(branch?: string): string {
  return branch ? `${DASHBOARD_SUMMARY_CACHE_KEY}:${branch}` : DASHBOARD_SUMMARY_CACHE_KEY;
}

export function dashboardSummaryPattern(): string {
  return `${DASHBOARD_SUMMARY_CACHE_KEY}*`;
}

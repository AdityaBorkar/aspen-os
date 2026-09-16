export const SUMMARY_CACHE_KEY = "compliance:summary";

export function summaryKey(branch?: string): string {
  return branch ? `${SUMMARY_CACHE_KEY}:${branch}` : SUMMARY_CACHE_KEY;
}

export function summaryPattern(): string {
  return `${SUMMARY_CACHE_KEY}*`;
}

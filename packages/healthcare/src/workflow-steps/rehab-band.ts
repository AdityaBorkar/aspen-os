export function scoreBand(score: number, maxScore?: number | null): string {
  if (!maxScore || maxScore <= 0) {
    return "unscaled";
  }
  const pct = score / maxScore;
  if (pct < 0.4) {
    return "low";
  }
  if (pct < 0.7) {
    return "moderate";
  }
  return "high";
}

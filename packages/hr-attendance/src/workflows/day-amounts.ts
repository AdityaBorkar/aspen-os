// ─── Day-amount helpers ──────────────────────────────────────────────────────
// Overtime hours are stored as text columns; every read funnels through this
// helper so float parsing lives in exactly one place.

export function toDays(value: string, label: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid day amount for "${label}": "${value}".`);
  }
  return parsed;
}

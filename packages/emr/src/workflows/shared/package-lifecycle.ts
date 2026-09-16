export const MS_PER_DAY = 86_400_000;

export const BILLING_PACKAGE_DEFAULT_VALIDITY_DAYS = 180;

export const AYUSH_PACKAGE_DEFAULT_VALIDITY_DAYS = 90;

export function packageExpiryAt(validityDays: number, fromMs?: number): Date {
  return new Date((fromMs ?? Date.now()) + validityDays * MS_PER_DAY);
}

export function packageExpiryDateOnly(soldAt: string, validityDays: number | null): string | null {
  if (validityDays === null) {
    return null;
  }
  return new Date(new Date(soldAt).getTime() + validityDays * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

export function remainingSessions(total: number, used: number): number {
  return Math.max(0, total - used);
}

export function packageIsLapsed(status: string, expiresAt: Date | null, nowMs?: number): boolean {
  if (status === "expired") {
    return true;
  }
  return expiresAt !== null && expiresAt.getTime() < (nowMs ?? Date.now());
}

export interface BalanceRedemption {
  left: number;
  nextBalance: Record<string, number>;
  nextStatus: string;
}

export interface ServiceRedemption {
  qty: number;
  serviceId: string;
}

export function applyBalanceRedemption(
  balance: Record<string, number>,
  redemption: ServiceRedemption,
  currentStatus: string,
): BalanceRedemption {
  const left = (balance[redemption.serviceId] ?? redemption.qty) - redemption.qty;
  if (left < 0) {
    throw new Error("Redeem would make balance negative; check the remaining sessions and retry");
  }
  const nextBalance = { ...balance, [redemption.serviceId]: left };
  const exhausted = Object.values(nextBalance).every((value) => value <= 0);
  return { left, nextBalance, nextStatus: exhausted ? "exhausted" : currentStatus };
}

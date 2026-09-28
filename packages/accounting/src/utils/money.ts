export interface MoneyTotals {
  grandTotal: number;
  netTotal: number;
  taxTotal: number;
}

export function toMoney(value: number): string {
  return value.toFixed(2);
}

export function parseMoney(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export const GL_TOLERANCE = 0.005;

export function assertBalanced(totalDebit: number, totalCredit: number): void {
  if (Math.abs(roundMoney(totalDebit) - roundMoney(totalCredit)) > GL_TOLERANCE) {
    throw new Error(
      `Unbalanced entry: debit ${totalDebit.toFixed(2)} != credit ${totalCredit.toFixed(2)}.`,
    );
  }
}

export function toDateOnly(value: Date | string): string {
  if (value instanceof Date) {
    const iso = value.toISOString();
    return iso.split("T")[0] ?? iso;
  }
  return value.split("T")[0] ?? value;
}

export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) {
    return false;
  }
  return isOverdueOn(dueDate, todayDateOnly());
}

export function isOverdueOn(
  dueDate: string | null | undefined,
  asOf: string | null | undefined,
): boolean {
  if (!dueDate) {
    return false;
  }
  const pivot = asOf ?? todayDateOnly();
  return dueDate < pivot;
}

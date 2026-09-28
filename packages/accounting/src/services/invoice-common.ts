import { accountingAccount } from "#/db-schemas/chart";
import { GL_TOLERANCE, parseMoney, roundMoney } from "#/utils/money";
import type { Db } from "#/workflows/db";

import { eq } from "drizzle-orm";

export interface LedgerAccountRow {
  id: string;
  is_disabled: boolean;
  is_group: boolean;
  name: string;
}

export async function assertLedgerAccount(
  db: Db,
  accountId: string,
  label: string,
): Promise<LedgerAccountRow> {
  const [account] = await db
    .select({
      id: accountingAccount.id,
      is_disabled: accountingAccount.is_disabled,
      is_group: accountingAccount.is_group,
      name: accountingAccount.name,
    })
    .from(accountingAccount)
    .where(eq(accountingAccount.id, accountId))
    .limit(1);
  if (!account) {
    throw new Error(`Account "${accountId}" (${label}) not found.`);
  }
  if (account.is_group) {
    throw new Error(`Group account "${account.name}" cannot post. Use a ledger.`);
  }
  if (account.is_disabled) {
    throw new Error(`Account "${account.name}" is disabled.`);
  }
  return account;
}

export function nextInvoiceStatus(
  outstanding: number,
  allocated: number,
  writtenOff: number,
): "paid" | "partly_paid" | "unpaid" {
  if (outstanding <= GL_TOLERANCE) {
    return "paid";
  }
  if (allocated > GL_TOLERANCE || writtenOff > GL_TOLERANCE) {
    return "partly_paid";
  }
  return "unpaid";
}

export function restoredInvoiceStatus(allocated: number): "partly_paid" | "unpaid" {
  if (allocated <= GL_TOLERANCE) {
    return "unpaid";
  }
  return "partly_paid";
}

export interface RestoredPaymentBalance {
  allocated: number;
  outstanding: number;
  status: "partly_paid" | "unpaid";
}

export function restorePaymentFromBalance(
  outstandingRaw: string | number | null,
  allocatedRaw: string | number | null,
  amount: number,
): RestoredPaymentBalance {
  const outstanding = roundMoney(parseMoney(outstandingRaw) + amount);
  const allocated = roundMoney(parseMoney(allocatedRaw) - amount);
  return {
    allocated: Math.max(0, allocated),
    outstanding,
    status: restoredInvoiceStatus(Math.max(0, allocated)),
  };
}

export function groupLineAmounts<TLine>(
  lines: TLine[],
  accountOf: (line: TLine) => string,
  amountOf: (line: TLine) => number,
): Map<string, number> {
  const grouped = new Map<string, number>();
  for (const line of lines) {
    const key = accountOf(line);
    grouped.set(key, roundMoney((grouped.get(key) ?? 0) + amountOf(line)));
  }
  return grouped;
}

export function orderBillingPercent(totalQty: number, billedQty: number): number {
  if (totalQty <= 0) {
    return 0;
  }
  return roundMoney((billedQty / totalQty) * 100);
}

export function orderBillingStatus(
  billedPercent: number,
  counterpartPercent: number,
  counterpartKind: "delivered" | "received",
): "completed" | "to_bill" | "to_deliver" | "to_receive" | null {
  if (billedPercent >= 100 && counterpartPercent >= 100) {
    return "completed";
  }
  if (billedPercent >= 100) {
    return counterpartKind === "delivered" ? "to_deliver" : "to_receive";
  }
  if (counterpartPercent >= 100) {
    return "to_bill";
  }
  return null;
}

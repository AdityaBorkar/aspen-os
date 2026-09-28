import { accountingTaxRule } from "#/db-schemas/tax";
import { parseMoney, roundMoney } from "#/utils/money";

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type Db = PostgresJsDatabase;

export interface TotalsLineInput {
  discountAmount?: number;
  discountPercent?: number;
  itemTaxTemplateId?: string | null;
  qty?: number;
  rate?: number;
}

export interface TaxRuleRow {
  account_head: string;
  charge_type: string;
  rate: string | number | null;
  row_index: number | null;
}

export interface ComputeTotalsInput {
  db: Db;
  lines: TotalsLineInput[];
  taxTemplateId?: string | null;
}

export interface ComputedTaxRow {
  accountHead: string;
  amount: number;
  chargeType: string;
  rate: number;
}

export interface ComputedTotals {
  grandTotal: number;
  netTotal: number;
  taxRows: ComputedTaxRow[];
  taxTotal: number;
}

function lineNet(line: TotalsLineInput): number {
  const qty = line.qty ?? 1;
  const rate = line.rate ?? 0;
  const gross = qty * rate;
  const percentDiscount = gross * ((line.discountPercent ?? 0) / 100);
  return roundMoney(gross - percentDiscount - (line.discountAmount ?? 0));
}

export async function computeDocumentTotals(input: ComputeTotalsInput): Promise<ComputedTotals> {
  const { db, lines, taxTemplateId } = input;
  let netTotal = 0;
  for (const line of lines) {
    netTotal = roundMoney(netTotal + lineNet(line));
  }

  async function rulesFor(templateId: string): Promise<TaxRuleRow[]> {
    const rules = await db
      .select({
        account_head: accountingTaxRule.account_head,
        charge_type: accountingTaxRule.charge_type,
        rate: accountingTaxRule.rate,
        row_index: accountingTaxRule.row_index,
      })
      .from(accountingTaxRule)
      .where(eq(accountingTaxRule.template_id, templateId));
    return [...rules]
      .sort((first, second) => (first.row_index ?? 0) - (second.row_index ?? 0))
      .map((rule) => ({
        account_head: rule.account_head,
        charge_type: rule.charge_type,
        rate: rule.rate,
        row_index: rule.row_index,
      }));
  }

  function taxesFor(net: number, rules: TaxRuleRow[]): ComputedTaxRow[] {
    const rows: ComputedTaxRow[] = [];
    let previousTotal = 0;
    for (const typed of rules) {
      const rate = parseMoney(typed.rate);
      let base = net;
      if (typed.charge_type === "on_previous_row") {
        base = previousTotal === 0 ? net : previousTotal;
      }
      let amount = 0;
      if (typed.charge_type === "actual") {
        amount = roundMoney(rate);
      } else {
        amount = roundMoney((base * rate) / 100);
      }
      previousTotal = roundMoney(previousTotal + amount);
      rows.push({
        accountHead: typed.account_head,
        amount,
        chargeType: typed.charge_type,
        rate,
      });
    }
    return rows;
  }

  const taxRows: ComputedTaxRow[] = [];
  if (taxTemplateId) {
    const rules = await rulesFor(taxTemplateId);
    for (const row of taxesFor(netTotal, rules)) {
      taxRows.push(row);
    }
  }

  for (const line of lines) {
    if (line.itemTaxTemplateId) {
      const rules = await rulesFor(line.itemTaxTemplateId);
      const net = lineNet(line);
      for (const row of taxesFor(net, rules)) {
        const existing = taxRows.find((candidate) => candidate.accountHead === row.accountHead);
        if (existing) {
          existing.amount = roundMoney(existing.amount + row.amount);
        } else {
          taxRows.push(row);
        }
      }
    }
  }

  let taxTotal = 0;
  for (const row of taxRows) {
    taxTotal = roundMoney(taxTotal + row.amount);
  }
  return { grandTotal: roundMoney(netTotal + taxTotal), netTotal, taxRows, taxTotal };
}

export function lineAmount(line: TotalsLineInput): number {
  return lineNet(line);
}

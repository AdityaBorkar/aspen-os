import { accountingTaxRule } from "#/db-schemas/tax";
import { parseMoney, roundMoney } from "#/utils/money";
import type { Db } from "#/workflows/db";

import { inArray } from "drizzle-orm";

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
  template_id: string;
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

export function lineNet(line: TotalsLineInput): number {
  const qty = line.qty ?? 1;
  const rate = line.rate ?? 0;
  const gross = qty * rate;
  const percentDiscount = gross * ((line.discountPercent ?? 0) / 100);
  return roundMoney(gross - percentDiscount - (line.discountAmount ?? 0));
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
    const amount =
      typed.charge_type === "actual" ? roundMoney(rate) : roundMoney((base * rate) / 100);
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

function mergeTaxRow(taxRows: ComputedTaxRow[], row: ComputedTaxRow): void {
  const existing = taxRows.find((candidate) => candidate.accountHead === row.accountHead);
  if (existing) {
    existing.amount = roundMoney(existing.amount + row.amount);
  } else {
    taxRows.push(row);
  }
}

export async function computeDocumentTotals(input: ComputeTotalsInput): Promise<ComputedTotals> {
  const { db, lines, taxTemplateId } = input;
  const lineNets = lines.map((line) => lineNet(line));
  let netTotal = 0;
  for (const net of lineNets) {
    netTotal = roundMoney(netTotal + net);
  }

  const templateIds = new Set<string>();
  if (taxTemplateId) {
    templateIds.add(taxTemplateId);
  }
  for (const line of lines) {
    if (line.itemTaxTemplateId) {
      templateIds.add(line.itemTaxTemplateId);
    }
  }

  const rulesByTemplate = new Map<string, TaxRuleRow[]>();
  if (templateIds.size > 0) {
    const rules = await db
      .select({
        account_head: accountingTaxRule.account_head,
        charge_type: accountingTaxRule.charge_type,
        rate: accountingTaxRule.rate,
        row_index: accountingTaxRule.row_index,
        template_id: accountingTaxRule.template_id,
      })
      .from(accountingTaxRule)
      .where(inArray(accountingTaxRule.template_id, [...templateIds]));
    for (const rule of rules) {
      const list = rulesByTemplate.get(rule.template_id) ?? [];
      list.push(rule);
      rulesByTemplate.set(rule.template_id, list);
    }
    for (const list of rulesByTemplate.values()) {
      list.sort((first, second) => (first.row_index ?? 0) - (second.row_index ?? 0));
    }
  }

  const taxRows: ComputedTaxRow[] = [];
  if (taxTemplateId) {
    for (const row of taxesFor(netTotal, rulesByTemplate.get(taxTemplateId) ?? [])) {
      taxRows.push(row);
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const templateId = lines[index]?.itemTaxTemplateId;
    if (!templateId) {
      continue;
    }
    const net = lineNets[index] ?? 0;
    for (const row of taxesFor(net, rulesByTemplate.get(templateId) ?? [])) {
      mergeTaxRow(taxRows, row);
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

import {
  healthcareGrn,
  healthcarePharmacyReturn,
  healthcarePharmacySale,
  healthcareStockTransfer,
} from "#/db-schemas/pharmacy";
import { StockLedgerQuerySchema } from "#/schemas/pharmacy";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { is, number, object, optional, parse, string } from "valibot";
import type { InferOutput } from "valibot";

const StockLedgerInputSchema = object({ input: StockLedgerQuerySchema });

export interface Movement {
  at: string;
  detail: string;
  direction: "in" | "out" | "move";
  id: string;
  itemId: string | null;
  kind: "sale" | "return" | "transfer" | "grn";
  qty: number | null;
  ref: string;
}

const SaleLineSchema = object({
  batchId: optional(string()),
  itemId: string(),
  qty: number(),
});

const ReturnLineSchema = object({
  disposition: optional(string()),
  itemId: string(),
  qty: number(),
});

const GrnLineSchema = object({
  itemId: string(),
  qty: number(),
});

type SaleLine = InferOutput<typeof SaleLineSchema>;
type ReturnLine = InferOutput<typeof ReturnLineSchema>;
type GrnLine = InferOutput<typeof GrnLineSchema>;

function isSaleLine(value: JsonValue): value is SaleLine {
  if (value instanceof Date || Array.isArray(value)) {
    return false;
  }
  return is(SaleLineSchema, value);
}

function isReturnLine(value: JsonValue): value is ReturnLine {
  if (value instanceof Date || Array.isArray(value)) {
    return false;
  }
  return is(ReturnLineSchema, value);
}

function isGrnLine(value: JsonValue): value is GrnLine {
  if (value instanceof Date || Array.isArray(value)) {
    return false;
  }
  return is(GrnLineSchema, value);
}

function readLines(payload: Record<string, JsonValue>, key: string): JsonValue[] {
  const raw = payload[key];
  return Array.isArray(raw) ? raw : [];
}

export const stockLedger = Workflow.name("healthcare.pharmacy.stock-ledger")
  .input(StockLedgerInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(StockLedgerQuerySchema, input);
    const branchId = parsed.branchId ?? "main";
    const perTable = Math.min(parsed.limit ?? 100, 500);

    const [sales, returns, transfers, grns] = await ctx.step.run("load-movements", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcarePharmacySale)
          .where(eq(healthcarePharmacySale.branch_id, branchId))
          .orderBy(desc(healthcarePharmacySale.created_at))
          .limit(perTable),
        ctx.db
          .select()
          .from(healthcarePharmacyReturn)
          .where(eq(healthcarePharmacyReturn.branch_id, branchId))
          .orderBy(desc(healthcarePharmacyReturn.created_at))
          .limit(perTable),
        ctx.db
          .select()
          .from(healthcareStockTransfer)
          .where(eq(healthcareStockTransfer.branch_id, branchId))
          .orderBy(desc(healthcareStockTransfer.created_at))
          .limit(perTable),
        ctx.db
          .select()
          .from(healthcareGrn)
          .where(eq(healthcareGrn.branch_id, branchId))
          .orderBy(desc(healthcareGrn.created_at))
          .limit(perTable),
      ]),
    );

    const movements: Movement[] = [];
    for (const sale of sales) {
      for (const entry of readLines(sale.payload, "lines")) {
        if (!isSaleLine(entry)) {
          continue;
        }
        if (parsed.itemId && entry.itemId !== parsed.itemId) {
          continue;
        }
        movements.push({
          at: sale.created_at.toISOString(),
          detail: `batch ${entry.batchId ?? "—"}`,
          direction: "out",
          id: sale.id,
          itemId: entry.itemId,
          kind: "sale",
          qty: entry.qty,
          ref: sale.sale_no,
        });
      }
    }
    for (const ret of returns) {
      for (const entry of readLines(ret.payload, "items")) {
        if (!isReturnLine(entry)) {
          continue;
        }
        if (parsed.itemId && entry.itemId !== parsed.itemId) {
          continue;
        }
        movements.push({
          at: ret.created_at.toISOString(),
          detail: entry.disposition ?? "restock",
          direction: "in",
          id: ret.id,
          itemId: entry.itemId,
          kind: "return",
          qty: entry.qty,
          ref: ret.return_no,
        });
      }
    }
    for (const trf of transfers) {
      if (parsed.itemId && trf.item_id !== parsed.itemId) {
        continue;
      }
      movements.push({
        at: trf.created_at.toISOString(),
        detail: `${trf.from_location} → ${trf.to_location} (${trf.status})`,
        direction: "move",
        id: trf.id,
        itemId: trf.item_id,
        kind: "transfer",
        qty: trf.qty,
        ref: trf.transfer_no,
      });
    }
    for (const grn of grns) {
      for (const entry of readLines(grn.payload, "received")) {
        if (!isGrnLine(entry)) {
          continue;
        }
        if (parsed.itemId && entry.itemId !== parsed.itemId) {
          continue;
        }
        movements.push({
          at: grn.created_at.toISOString(),
          detail: `PO ${grn.po_id}`,
          direction: "in",
          id: grn.id,
          itemId: entry.itemId,
          kind: "grn",
          qty: entry.qty,
          ref: grn.grn_no,
        });
      }
    }
    movements.sort((a, b) => (a.at < b.at ? 1 : -1));
    return { branchId, movements: movements.slice(0, perTable) };
  });

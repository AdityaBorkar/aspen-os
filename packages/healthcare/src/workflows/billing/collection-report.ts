import { healthcareReceipt } from "#/db-schemas/billing";
import { CollectionReportSchema } from "#/schemas/billing";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { object, parse } from "valibot";

const CollectionReportInputSchema = object({ input: CollectionReportSchema });

export const collectionReport = Workflow.name("healthcare.billing.collection-report")
  .input(CollectionReportInputSchema)
  .handler(async ({ input }, ctx) => {
    // Healthcare keeps the dues/aging/GST/TAT computations as query helpers;
    // the shared surface (workspace, interim; reports when real) owns grants,
    // views, CSV export, and report-definition storage.
    const parsed = parse(CollectionReportSchema, input);
    const branchId = parsed.branchId ?? "main";

    const conditions = [eq(healthcareReceipt.branch_id, branchId)];
    if (parsed.from) {
      conditions.push(gte(healthcareReceipt.created_at, new Date(parsed.from)));
    }
    if (parsed.to) {
      conditions.push(lte(healthcareReceipt.created_at, new Date(parsed.to)));
    }
    const rows = await ctx.step.run("load-receipts", async () =>
      ctx.db
        .select()
        .from(healthcareReceipt)
        .where(and(...conditions))
        .orderBy(desc(healthcareReceipt.created_at))
        .limit(2000),
    );
    const byMode: Record<string, number> = {};
    let total = 0;
    const lines = [];
    for (const row of rows) {
      const amount = Number(row.amount);
      total += amount;
      byMode[row.mode] = (byMode[row.mode] ?? 0) + amount;
      lines.push({
        amount,
        at: row.created_at.toISOString(),
        invoiceId: row.invoice_id,
        mode: row.mode,
        receiptNo: row.receipt_no,
        ref: row.ref,
      });
    }
    return { byMode, count: rows.length, lines, total };
  });

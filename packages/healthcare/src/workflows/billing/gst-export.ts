import { healthcareInvoice } from "#/db-schemas/billing";
import { GstExportFiltersSchema } from "#/schemas/billing";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const GstExportInputSchema = object({ input: GstExportFiltersSchema });

export const gstExport = Workflow.name("healthcare.billing.gst-export")
  .input(GstExportInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(GstExportFiltersSchema, input);
    const branchId = parsed.branchId ?? "main";
    const month = parsed.month ?? new Date().toISOString().slice(0, 7);
    const rows = await ctx.step.run("load-month", async () =>
      ctx.db
        .select()
        .from(healthcareInvoice)
        .where(eq(healthcareInvoice.branch_id, branchId))
        .limit(1000),
    );
    const mine = rows.filter(
      (row) => row.created_at.toISOString().startsWith(month) && row.status !== "draft",
    );
    return {
      month,
      rows: mine.map((row) => ({
        gstPct: Number(row.gst_pct),
        id: row.id,
        no: row.invoice_no,
        taxable: Math.round(Number(row.total) / (1 + Number(row.gst_pct) / 100)),
        total: Number(row.total),
      })),
    };
  });

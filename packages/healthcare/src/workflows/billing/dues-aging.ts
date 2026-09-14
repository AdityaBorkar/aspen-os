import { healthcareInvoice } from "#/db-schemas/billing";
import { DuesAgingFiltersSchema } from "#/schemas/billing";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DuesAgingInputSchema = object({ input: DuesAgingFiltersSchema });

export const duesAging = Workflow.name("healthcare.billing.dues-aging")
  .input(DuesAgingInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DuesAgingFiltersSchema, input);
    const branchId = parsed.branchId ?? "main";
    const rows = await ctx.step.run("load-dues", async () =>
      ctx.db
        .select()
        .from(healthcareInvoice)
        .where(eq(healthcareInvoice.branch_id, branchId))
        .limit(1000),
    );
    const buckets = { current: 0, d30: 0, d60: 0, d90plus: 0 };
    const aged = [];
    for (const row of rows) {
      const due = Number(row.total) - Number(row.paid);
      if (due <= 0 || row.status === "draft") {
        continue;
      }
      const ageDays = Math.floor((Date.now() - row.created_at.getTime()) / 86_400_000);
      const bucket =
        ageDays <= 30 ? "current" : ageDays <= 60 ? "d30" : ageDays <= 90 ? "d60" : "d90plus";
      buckets[bucket] += due;
      aged.push({
        ageDays,
        bucket,
        due,
        id: row.id,
        no: row.invoice_no,
        patientId: row.patient_id,
      });
    }
    return { buckets, rows: aged };
  });

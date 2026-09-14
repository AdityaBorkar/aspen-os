import { healthcareInvoice } from "#/db-schemas/billing";
import { SettleTabSchema } from "#/schemas/billing";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InterimTabInputSchema = object({ input: SettleTabSchema });

export const interimTab = Workflow.name("healthcare.billing.interim-tab")
  .input(InterimTabInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SettleTabSchema, input);
    const branchId = parsed.branchId ?? "main";
    const rows = await ctx.step.run("load-tab", async () =>
      ctx.db
        .select()
        .from(healthcareInvoice)
        .where(
          and(
            eq(healthcareInvoice.branch_id, branchId),
            eq(healthcareInvoice.patient_id, parsed.patientId),
          ),
        )
        .limit(500),
    );
    const scoped =
      parsed.episodeId === undefined
        ? rows
        : rows.filter((row) => row.encounter_id === parsed.episodeId);
    const mine = scoped.filter((row) => ["draft", "final", "partial"].includes(row.status));
    return {
      episodeId: parsed.episodeId ?? null,
      invoices: mine.map((row) => ({
        id: row.id,
        invoiceNo: row.invoice_no,
        paid: Number(row.paid),
        status: row.status,
        total: Number(row.total),
      })),
      patientId: parsed.patientId,
      totalDue: mine.reduce((sum, row) => sum + (Number(row.total) - Number(row.paid)), 0),
    };
  });

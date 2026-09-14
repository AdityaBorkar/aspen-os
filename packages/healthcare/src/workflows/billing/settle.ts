import { healthcareAdvance, healthcareInvoice } from "#/db-schemas/billing";
import { SettleTabSchema } from "#/schemas/billing";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SettleInputSchema = object({ input: SettleTabSchema });

export const settle = Workflow.name("healthcare.billing.settle")
  .input(SettleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SettleTabSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [invoices, advances] = await ctx.step.run("load-settle", async () =>
      Promise.all([
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
        ctx.db
          .select()
          .from(healthcareAdvance)
          .where(
            and(
              eq(healthcareAdvance.branch_id, branchId),
              eq(healthcareAdvance.patient_id, parsed.patientId),
            ),
          )
          .limit(200),
      ]),
    );
    const open = invoices.filter((row) => ["final", "partial"].includes(row.status));
    const scoped =
      parsed.episodeId === undefined
        ? open
        : open.filter((row) => row.encounter_id === parsed.episodeId);
    const balance = advances.reduce((sum, row) => sum + Number(row.balance), 0);
    const gross = scoped.reduce((sum, row) => sum + (Number(row.total) - Number(row.paid)), 0);
    return {
      balance,
      episodeId: parsed.episodeId ?? null,
      openInvoices: scoped.map((row) => ({
        due: Number(row.total) - Number(row.paid),
        id: row.id,
        invoiceNo: row.invoice_no,
        status: row.status,
      })),
      patientId: parsed.patientId,
      totalDue: Math.max(0, gross - balance),
    };
  });

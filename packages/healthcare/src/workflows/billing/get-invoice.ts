import { InvoiceIdSchema } from "#/schemas/billing";
import { fetchInvoiceStep } from "#/workflow-steps/fetch-invoice";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const GetInvoiceInputSchema = object({ input: InvoiceIdSchema });

export const getInvoice = Workflow.name("healthcare.billing.get-invoice")
  .input(GetInvoiceInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(InvoiceIdSchema, input);
    const row = await ctx.step.run(fetchInvoiceStep, { id: parsed.id });
    return {
      createdAt: row.created_at.toISOString(),
      discountPct: Number(row.discount_pct),
      encounterId: row.encounter_id,
      gstPct: Number(row.gst_pct),
      id: row.id,
      invoiceNo: row.invoice_no,
      lines: row.lines,
      paid: Number(row.paid),
      patientId: row.patient_id,
      payer: row.payer,
      status: row.status,
      total: Number(row.total),
    };
  });

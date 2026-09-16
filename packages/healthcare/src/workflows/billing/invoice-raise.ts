import { healthcareInvoice, healthcarePackageBalance } from "#/db-schemas/billing";
import { healthcareInvoiceLine } from "#/db-schemas/invoice-line";
import { healthcareStayCharge } from "#/db-schemas/residents";
import { BILLING_EVENTS } from "#/pubsub";
import { CreateInvoiceSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { normalizeInvoiceFhirStatus } from "#/workflow-steps/canonical-dual-write";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InvoiceRaiseInputSchema = object({ input: CreateInvoiceSchema });

function totals(
  lines: { price: number; qty: number }[],
  discountPct: number,
  gstPct: number,
): number {
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const taxable = subtotal - (subtotal * discountPct) / 100;
  return Math.round((taxable + (taxable * gstPct) / 100) * 100) / 100;
}

export const invoiceRaise = Workflow.name("healthcare.billing.invoice-raise")
  .input(InvoiceRaiseInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateInvoiceSchema, input);
    const branchId = parsed.branchId ?? "main";
    if (parsed.lines.length === 0) {
      throw new Error("Invoice needs at least one line; add a service line and retry");
    }
    const knownSources = new Set([
      "consult",
      "diagnostics",
      "package",
      "pharmacy",
      "procedure",
      "stay",
    ]);
    for (const line of parsed.lines) {
      if (!knownSources.has(line.source)) {
        throw new Error(`Unknown line source ${line.source}; use a known source and retry`);
      }
    }
    await ctx.step.run("verify-source-lines", async () => {
      // oxlint-disable eslint/no-await-in-loop
      for (const line of parsed.lines) {
        if (line.source === "stay") {
          const [charge] = await ctx.db
            .select({ id: healthcareStayCharge.id })
            .from(healthcareStayCharge)
            .where(
              and(
                eq(healthcareStayCharge.id, line.serviceId),
                eq(healthcareStayCharge.branch_id, branchId),
              ),
            )
            .limit(1);
          if (!charge) {
            throw new Error(
              `Orphan line rejected: stay/${line.serviceId} not found; verify the source and retry`,
            );
          }
        }
        if (line.source === "package") {
          const [sale] = await ctx.db
            .select({ id: healthcarePackageBalance.id })
            .from(healthcarePackageBalance)
            .where(
              and(
                eq(healthcarePackageBalance.id, line.serviceId),
                eq(healthcarePackageBalance.branch_id, branchId),
              ),
            )
            .limit(1);
          if (!sale) {
            throw new Error(
              `Orphan line rejected: package/${line.serviceId} not found; verify the source and retry`,
            );
          }
        }
      }
      // oxlint-enable eslint/no-await-in-loop
    });
    const no = await ctx.step.run(nextHealthcareSeries, { input: { series: "invoice" } });
    const discountPct = parsed.discountPct ?? 0;
    const gstPct = parsed.gstPct ?? 0;
    const [row] = await ctx.step.run("insert-invoice", async () =>
      // Dual-write (HEALTHCARE-SPEC §§11, 13): invoice header first (lines
      // jsonb stays a derived cache rebuilt from the same lines[] source;
      // total stays derived via totals()), one healthcare_invoice_line row
      // per line second, inside one transaction. The ledger status column
      // is untouched; fhir_status is the INVOICE_STATUS_MAP projection.
      ctx.db.transaction(async (tx) => {
        const invoiceId = crypto.randomUUID();
        const [header] = await tx
          .insert(healthcareInvoice)
          .values({
            branch_id: branchId,
            discount_pct: String(discountPct),
            encounter_id: parsed.encounterId ?? null,
            gst_pct: String(gstPct),
            id: invoiceId,
            invoice_no: `INV-${String(no).padStart(6, "0")}`,
            lines: parsed.lines,
            paid: "0",
            patient_id: parsed.patientId,
            payer: parsed.payer ?? null,
            payload: { fhir: { fhir_status: normalizeInvoiceFhirStatus("draft") } },
            status: "draft",
            total: String(totals(parsed.lines, discountPct, gstPct)),
          })
          .returning();
        if (!header) {
          throw new Error("Failed to raise invoice.");
        }
        await tx.insert(healthcareInvoiceLine).values(
          parsed.lines.map((line) => ({
            branch_id: branchId,
            invoice_id: invoiceId,
            patient_id: parsed.patientId,
            price: String(line.price),
            qty: line.qty,
            service_id: line.serviceId,
            source: line.source,
            status: "active",
          })),
        );
        return [header];
      }),
    );
    if (!row) {
      throw new Error("Failed to raise invoice.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: { invoiceNo: row.invoice_no, status: row.status, total: row.total },
      });
      await ctx.pubsub.publish(BILLING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      createdAt: row.created_at.toISOString(),
      discountPct: Number(row.discount_pct),
      fhirStatus: normalizeInvoiceFhirStatus(row.status),
      gstPct: Number(row.gst_pct),
      id: row.id,
      invoiceNo: row.invoice_no,
      lines: row.lines,
      paid: Number(row.paid),
      patientId: row.patient_id,
      status: row.status,
      total: Number(row.total),
    };
  });

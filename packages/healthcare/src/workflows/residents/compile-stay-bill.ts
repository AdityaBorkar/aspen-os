import {
  healthcareAdvance,
  healthcareCreditDebitNote,
  healthcareInvoice,
} from "#/db-schemas/billing";
import { healthcareStayCharge } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { CompileStayBillSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CompileStayBillInputSchema = object({ input: CompileStayBillSchema });

export const compileStayBill = Workflow.name("healthcare.residents.compile-stay-bill")
  .input(CompileStayBillInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CompileStayBillSchema, input);
    const branchId = parsed.branchId ?? "main";
    const resident = await ctx.step.run(fetchResidentStep, { id: parsed.residentId });
    const uptoDate = parsed.uptoDate ?? new Date().toISOString().slice(0, 10);
    const [charges, advances, notes] = await ctx.step.run("load-compile", async () =>
      Promise.all([
        ctx.db
          .select()
          .from(healthcareStayCharge)
          .where(
            and(
              eq(healthcareStayCharge.branch_id, branchId),
              eq(healthcareStayCharge.resident_id, resident.id),
            ),
          )
          .limit(500),
        ctx.db
          .select()
          .from(healthcareAdvance)
          .where(
            and(
              eq(healthcareAdvance.branch_id, branchId),
              eq(healthcareAdvance.patient_id, resident.id),
            ),
          )
          .limit(200),
        ctx.db
          .select()
          .from(healthcareCreditDebitNote)
          .where(eq(healthcareCreditDebitNote.branch_id, branchId))
          .limit(500),
      ]),
    );
    const gross = charges.reduce((sum, row) => sum + Number(row.amount), 0);
    const advanceBalance = advances.reduce((sum, row) => sum + Number(row.balance), 0);
    const adjustments = notes
      .filter((row) => row.invoice_id === resident.id)
      .reduce(
        (sum, row) => sum + (row.kind === "CN" ? -Number(row.amount) : Number(row.amount)),
        0,
      );
    const total = Math.max(0, gross + adjustments - advanceBalance);
    // Advance-consumption alert at 80%: families top up before month-end.
    // The dues gate blocks discharge handover while dues remain, unless a
    // payer undertaking is recorded on the resident payload.
    const advanceTotal = advances.reduce((sum, row) => sum + Number(row.amount), 0);
    const advanceUsedPct =
      advanceTotal > 0
        ? Math.min(100, Math.round(((advanceTotal - advanceBalance) / advanceTotal) * 100))
        : 0;
    const advanceAlert =
      advanceUsedPct >= 80
        ? `Advance ${advanceUsedPct}% consumed; collect a top-up before month-end`
        : null;
    const duesBlocked = total > 0;
    const no = await ctx.step.run(nextHealthcareSeries, { input: { series: "invoice" } });
    const [row] = await ctx.step.run("insert-compiled-bill", async () =>
      ctx.db
        .insert(healthcareInvoice)
        .values({
          branch_id: branchId,
          discount_pct: "0",
          gst_pct: "0",
          invoice_no: `INV-${String(no).padStart(6, "0")}`,
          lines: charges.map((charge) => ({
            price: Number(charge.amount),
            qty: 1,
            serviceId: charge.id,
            source: "stay",
          })),
          paid: "0",
          patient_id: resident.id,
          payload: { adjustments, advanceBalance, gross, uptoDate },
          status: "draft",
          total: String(total),
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to compile stay bill.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RESIDENT,
        newState: { residentId: resident.id, total: row.total, uptoDate },
      });
      await ctx.pubsub.publish(RESIDENT_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      adjustments,
      advanceAlert,
      advanceBalance,
      advanceUsedPct,
      duesBlocked,
      gross,
      invoiceId: row.id,
      invoiceNo: row.invoice_no,
      total,
      uptoDate,
    };
  });

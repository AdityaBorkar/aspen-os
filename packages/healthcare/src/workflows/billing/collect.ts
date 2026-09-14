import { healthcareInvoice, healthcareReceipt } from "#/db-schemas/billing";
import { BILLING_EVENTS } from "#/pubsub";
import { CollectPaymentSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchInvoiceStep } from "#/workflow-steps/fetch-invoice";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CollectInputSchema = object({ input: CollectPaymentSchema });

export const collect = Workflow.name("healthcare.billing.collect")
  .input(CollectInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CollectPaymentSchema, input);
    const branchId = parsed.branchId ?? "main";
    const invoice = await ctx.step.run(fetchInvoiceStep, { id: parsed.invoiceId });
    if (invoice.status === "draft") {
      throw new Error("Draft invoice cannot collect payment; finalize it first");
    }
    const due = Number(invoice.total) - Number(invoice.paid);
    if (parsed.amount > due) {
      throw new Error("Collection exceeds the due amount; check the balance and retry");
    }
    const no = await ctx.step.run(nextHealthcareSeries, { input: { series: "receipt" } });
    const paid = Number(invoice.paid) + parsed.amount;
    const status = paid >= Number(invoice.total) ? "paid" : "partial";
    const [receipt] = await ctx.step.run("insert-receipt", async () =>
      ctx.db
        .insert(healthcareReceipt)
        .values({
          amount: String(parsed.amount),
          branch_id: branchId,
          invoice_id: invoice.id,
          mode: parsed.mode,
          receipt_no: `RCP-${String(no).padStart(6, "0")}`,
          ref: parsed.ref ?? null,
          status: "collected",
        })
        .returning(),
    );
    if (!receipt) {
      throw new Error("Failed to record receipt.");
    }
    const [row] = await ctx.step.run("update-invoice", async () =>
      ctx.db
        .update(healthcareInvoice)
        .set({ paid: String(paid), status, updated_at: new Date() })
        .where(eq(healthcareInvoice.id, invoice.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to update invoice balance.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.COLLECTED,
        crudAction: "create",
        entityId: receipt.id,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: { amount: receipt.amount, invoiceId: invoice.id, mode: receipt.mode },
      });
      await ctx.pubsub.publish(BILLING_EVENTS.COLLECTED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: receipt.id,
      });
    });
    return { invoiceStatus: row.status, paid, receiptId: receipt.id };
  });

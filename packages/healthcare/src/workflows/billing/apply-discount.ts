import { healthcareInvoice } from "#/db-schemas/billing";
import { BILLING_EVENTS } from "#/pubsub";
import { ApplyDiscountSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchInvoiceStep } from "#/workflow-steps/fetch-invoice";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ApplyDiscountInputSchema = object({ input: ApplyDiscountSchema });

const DISCOUNT_THRESHOLD = 15;

export const applyDiscount = Workflow.name("healthcare.billing.apply-discount")
  .input(ApplyDiscountInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ApplyDiscountSchema, input);
    const branchId = parsed.branchId ?? "main";
    const invoice = await ctx.step.run(fetchInvoiceStep, { id: parsed.invoiceId });
    if (invoice.status === "paid") {
      throw new Error("Paid invoice cannot be discounted; issue a credit note instead");
    }
    if (parsed.discountPct > DISCOUNT_THRESHOLD) {
      if (!parsed.approver || parsed.approver === parsed.requestedBy) {
        throw new Error(
          "Discount above 15% needs maker-checker approval; add a different approver and retry",
        );
      }
    }
    const subtotal = invoice.lines.reduce((sum, line) => sum + line.price * line.qty, 0);
    const taxable = subtotal - (subtotal * parsed.discountPct) / 100;
    const total = Math.round((taxable + (taxable * Number(invoice.gst_pct)) / 100) * 100) / 100;
    const [row] = await ctx.step.run("apply-discount", async () =>
      ctx.db
        .update(healthcareInvoice)
        .set({
          discount_pct: String(parsed.discountPct),
          payload: { ...invoice.payload, approver: parsed.approver ?? null },
          total: String(total),
          updated_at: new Date(),
        })
        .where(eq(healthcareInvoice.id, invoice.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to apply discount.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DISCOUNT_APPROVED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: { discountPct: parsed.discountPct, total: row.total },
      });
      await ctx.pubsub.publish(BILLING_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { discountPct: parsed.discountPct, invoiceId: row.id };
  });

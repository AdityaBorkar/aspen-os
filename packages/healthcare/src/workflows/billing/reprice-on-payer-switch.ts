import { healthcareInvoice, healthcarePricelist } from "#/db-schemas/billing";
import { BILLING_EVENTS } from "#/pubsub";
import { RepriceInvoiceSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchInvoiceStep } from "#/workflow-steps/fetch-invoice";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RepriceInputSchema = object({ input: RepriceInvoiceSchema });

export const repriceOnPayerSwitch = Workflow.name("healthcare.billing.reprice-on-payer-switch")
  .input(RepriceInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RepriceInvoiceSchema, input);
    const branchId = parsed.branchId ?? "main";
    const invoice = await ctx.step.run(fetchInvoiceStep, { id: parsed.invoiceId });
    if (invoice.status !== "draft") {
      throw new Error(
        "Only draft invoices can be repriced; cancel-and-CN a billed invoice instead",
      );
    }
    const [pricelist] = await ctx.step.run("load-pricelist", async () =>
      ctx.db
        .select()
        .from(healthcarePricelist)
        .where(eq(healthcarePricelist.id, parsed.pricelistId))
        .limit(1),
    );
    if (!pricelist) {
      throw new Error("Pricelist not found; verify the pricelist id and retry");
    }
    const lines = invoice.lines.map((line) => {
      const rate = pricelist.rates.find((entry) => entry.serviceId === line.serviceId);
      return rate ? { ...line, price: rate.price } : line;
    });
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
    const taxable = subtotal - (subtotal * Number(invoice.discount_pct)) / 100;
    const total = Math.round((taxable + (taxable * Number(invoice.gst_pct)) / 100) * 100) / 100;
    const [row] = await ctx.step.run("reprice-invoice", async () =>
      ctx.db
        .update(healthcareInvoice)
        .set({
          lines,
          payload: { ...invoice.payload, repricedAt: new Date().toISOString() },
          pricelist_id: pricelist.id,
          total: String(total),
          updated_at: new Date(),
        })
        .where(eq(healthcareInvoice.id, invoice.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to reprice invoice.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: { pricelistId: pricelist.id, total: row.total },
      });
      await ctx.pubsub.publish(BILLING_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { invoiceId: row.id };
  });

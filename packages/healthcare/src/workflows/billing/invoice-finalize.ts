import { healthcareInvoice } from "#/db-schemas/billing";
import { BILLING_EVENTS } from "#/pubsub";
import { FinalizeInvoiceSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchInvoiceStep } from "#/workflow-steps/fetch-invoice";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InvoiceFinalizeInputSchema = object({ input: FinalizeInvoiceSchema });

export const invoiceFinalize = Workflow.name("healthcare.billing.invoice-finalize")
  .input(InvoiceFinalizeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(FinalizeInvoiceSchema, input);
    const branchId = parsed.branchId ?? "main";
    const invoice = await ctx.step.run(fetchInvoiceStep, { id: parsed.invoiceId });
    if (invoice.status !== "draft") {
      throw new Error("Only draft invoices can be finalized; check the invoice status");
    }
    const [row] = await ctx.step.run("finalize-invoice", async () =>
      ctx.db
        .update(healthcareInvoice)
        .set({ status: "final", updated_at: new Date() })
        .where(eq(healthcareInvoice.id, invoice.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to finalize invoice.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: { status: row.status },
      });
      await ctx.pubsub.publish(BILLING_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { invoiceId: row.id, status: row.status };
  });

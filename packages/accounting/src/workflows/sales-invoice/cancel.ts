import { accountingSalesInvoice } from "#/db-schemas/sales";
import { SALES_INVOICE_EVENTS } from "#/pubsub";
import { reverseGlEntries } from "#/services/gl-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const cancelSalesInvoice = Workflow.name("accounting.sales-invoice.cancel")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [invoice] = await ctx.db
      .select()
      .from(accountingSalesInvoice)
      .where(eq(accountingSalesInvoice.id, id))
      .limit(1);
    if (!invoice) {
      throw new Error(`Sales invoice "${id}" not found.`);
    }
    if (invoice.status === "cancelled") {
      return invoice;
    }
    if (invoice.status === "paid" || invoice.status === "partly_paid") {
      throw new Error("Unwind payments and returns before cancelling a paid invoice.");
    }

    await ctx.db.transaction(async (tx) => {
      if (invoice.status !== "draft") {
        await reverseGlEntries({
          db: tx,
          fiscalYear: "cancellation",
          postingDate: invoice.posting_date,
          voucherId: id,
          voucherType: "Sales Invoice",
        });
      }
      await tx
        .update(accountingSalesInvoice)
        .set({ status: "cancelled", updated_at: new Date() })
        .where(eq(accountingSalesInvoice.id, id));
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingSalesInvoice)
      .where(eq(accountingSalesInvoice.id, id))
      .limit(1);
    const row = assertUpdated(updated, `Sales invoice "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CANCELLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { status: "cancelled" },
      });
      await ctx.pubsub.publish(SALES_INVOICE_EVENTS.CANCELLED, { salesInvoiceId: id });
    });

    return row;
  });

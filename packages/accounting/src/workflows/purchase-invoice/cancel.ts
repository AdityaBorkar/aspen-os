import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { PURCHASE_INVOICE_EVENTS } from "#/pubsub";
import { assertPeriodOpen } from "#/services/fiscal-service";
import { reverseGlEntries } from "#/services/gl-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const cancelPurchaseInvoice = Workflow.name("accounting.purchase-invoice.cancel")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [invoice] = await ctx.db
      .select()
      .from(accountingPurchaseInvoice)
      .where(eq(accountingPurchaseInvoice.id, id))
      .limit(1);
    if (!invoice) {
      throw new Error(`Purchase invoice "${id}" not found.`);
    }
    if (invoice.status === "cancelled") {
      return invoice;
    }
    if (invoice.status === "paid" || invoice.status === "partly_paid") {
      throw new Error("Unwind payments and returns before cancelling a paid invoice.");
    }

    await ctx.db.transaction(async (tx) => {
      if (invoice.status !== "draft") {
        const year = await assertPeriodOpen({ db: tx, postingDate: invoice.posting_date });
        await reverseGlEntries({
          db: tx,
          fiscalYear: year.name,
          postingDate: invoice.posting_date,
          voucherId: id,
          voucherType: "Purchase Invoice",
        });
      }
      await tx
        .update(accountingPurchaseInvoice)
        .set({ status: "cancelled", updated_at: new Date() })
        .where(eq(accountingPurchaseInvoice.id, id));
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingPurchaseInvoice)
      .where(eq(accountingPurchaseInvoice.id, id))
      .limit(1);
    const row = assertUpdated(updated, `Purchase invoice "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CANCELLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.PURCHASE_INVOICE,
        newState: { status: "cancelled" },
      });
      await ctx.pubsub.publish(PURCHASE_INVOICE_EVENTS.CANCELLED, { purchaseInvoiceId: id });
    });

    return row;
  });

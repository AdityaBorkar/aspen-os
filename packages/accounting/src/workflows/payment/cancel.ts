import { accountingPaymentEntry, accountingPaymentReference } from "#/db-schemas/payment";
import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { accountingSalesInvoice } from "#/db-schemas/sales";
import { reverseGlEntries } from "#/services/gl-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney, roundMoney, toMoney } from "#/utils/money";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const cancelPaymentEntry = Workflow.name("accounting.payment.cancel")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [entry] = await ctx.db
      .select()
      .from(accountingPaymentEntry)
      .where(eq(accountingPaymentEntry.id, id))
      .limit(1);
    if (!entry) {
      throw new Error(`Payment entry "${id}" not found.`);
    }
    if (entry.status === "cancelled") {
      return entry;
    }

    const references = await ctx.db
      .select()
      .from(accountingPaymentReference)
      .where(eq(accountingPaymentReference.payment_id, id));

    await ctx.db.transaction(async (tx) => {
      for (const reference of references) {
        if (reference.reference_type === "Sales Invoice") {
          const [invoice] = await tx
            .select()
            .from(accountingSalesInvoice)
            .where(eq(accountingSalesInvoice.id, reference.reference_id))
            .limit(1);
          if (invoice) {
            const amount = parseMoney(reference.allocated_amount);
            const outstanding = roundMoney(parseMoney(invoice.outstanding_amount) + amount);
            const allocated = roundMoney(parseMoney(invoice.allocated_amount) - amount);
            let { status } = invoice;
            if (allocated <= 0.005) {
              status = "unpaid";
            } else {
              status = "partly_paid";
            }
            await tx
              .update(accountingSalesInvoice)
              .set({
                allocated_amount: toMoney(Math.max(0, allocated)),
                outstanding_amount: toMoney(outstanding),
                status,
                updated_at: new Date(),
              })
              .where(eq(accountingSalesInvoice.id, invoice.id));
          }
        } else if (reference.reference_type === "Purchase Invoice") {
          const [invoice] = await tx
            .select()
            .from(accountingPurchaseInvoice)
            .where(eq(accountingPurchaseInvoice.id, reference.reference_id))
            .limit(1);
          if (invoice) {
            const amount = parseMoney(reference.allocated_amount);
            const outstanding = roundMoney(parseMoney(invoice.outstanding_amount) + amount);
            const allocated = roundMoney(parseMoney(invoice.allocated_amount) - amount);
            let { status } = invoice;
            if (allocated <= 0.005) {
              status = "unpaid";
            } else {
              status = "partly_paid";
            }
            await tx
              .update(accountingPurchaseInvoice)
              .set({
                allocated_amount: toMoney(Math.max(0, allocated)),
                outstanding_amount: toMoney(outstanding),
                status,
                updated_at: new Date(),
              })
              .where(eq(accountingPurchaseInvoice.id, invoice.id));
          }
        }
        await tx
          .delete(accountingPaymentReference)
          .where(eq(accountingPaymentReference.id, reference.id));
      }

      await reverseGlEntries({
        db: tx,
        fiscalYear: "cancellation",
        postingDate: entry.posting_date,
        voucherId: id,
        voucherType: "Payment Entry",
      });

      await tx
        .update(accountingPaymentEntry)
        .set({ status: "cancelled", updated_at: new Date() })
        .where(eq(accountingPaymentEntry.id, id));
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingPaymentEntry)
      .where(eq(accountingPaymentEntry.id, id))
      .limit(1);
    const row = assertUpdated(updated, `Payment entry "${id}"`);

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CANCELLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT,
        newState: { status: "cancelled" },
      });
    });

    return row;
  });

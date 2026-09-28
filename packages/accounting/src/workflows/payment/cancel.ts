import { accountingPaymentEntry, accountingPaymentReference } from "#/db-schemas/payment";
import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { accountingSalesInvoice } from "#/db-schemas/sales";
import { assertPeriodOpen } from "#/services/fiscal-service";
import { reverseGlEntries } from "#/services/gl-service";
import { restorePaymentFromBalance } from "#/services/invoice-common";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney, toMoney } from "#/utils/money";
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

    const year = await assertPeriodOpen({ db: ctx.db, postingDate: entry.posting_date });

    await ctx.db.transaction(async (tx) => {
      for (const reference of references) {
        const amount = parseMoney(reference.allocated_amount);
        if (reference.reference_type === "Sales Invoice") {
          const [invoice] = await tx
            .select()
            .from(accountingSalesInvoice)
            .where(eq(accountingSalesInvoice.id, reference.reference_id))
            .limit(1);
          if (invoice) {
            const restored = restorePaymentFromBalance(
              invoice.outstanding_amount,
              invoice.allocated_amount,
              amount,
            );
            await tx
              .update(accountingSalesInvoice)
              .set({
                allocated_amount: toMoney(restored.allocated),
                outstanding_amount: toMoney(restored.outstanding),
                status: restored.status,
                updated_at: new Date(),
              })
              .where(eq(accountingSalesInvoice.id, invoice.id));
          }
        } else {
          const [invoice] = await tx
            .select()
            .from(accountingPurchaseInvoice)
            .where(eq(accountingPurchaseInvoice.id, reference.reference_id))
            .limit(1);
          if (invoice) {
            const restored = restorePaymentFromBalance(
              invoice.outstanding_amount,
              invoice.allocated_amount,
              amount,
            );
            await tx
              .update(accountingPurchaseInvoice)
              .set({
                allocated_amount: toMoney(restored.allocated),
                outstanding_amount: toMoney(restored.outstanding),
                status: restored.status,
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
        fiscalYear: year.name,
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

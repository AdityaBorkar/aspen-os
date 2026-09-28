import { accountingPaymentEntry, accountingPaymentReference } from "#/db-schemas/payment";
import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { accountingSalesInvoice } from "#/db-schemas/sales";
import { PAYMENT_EVENTS } from "#/pubsub";
import { restorePaymentFromBalance } from "#/services/invoice-common";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney, roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ paymentId: string(), referenceId: string() });

export const unreconcilePayment = Workflow.name("accounting.reconciliation.unreconcile")
  .input(InputSchema)
  .handler(async ({ paymentId, referenceId }, ctx) => {
    const [payment] = await ctx.db
      .select()
      .from(accountingPaymentEntry)
      .where(eq(accountingPaymentEntry.id, paymentId))
      .limit(1);
    if (!payment) {
      throw new Error(`Payment entry "${paymentId}" not found.`);
    }

    const [reference] = await ctx.db
      .select()
      .from(accountingPaymentReference)
      .where(
        and(
          eq(accountingPaymentReference.payment_id, paymentId),
          eq(accountingPaymentReference.reference_id, referenceId),
        ),
      )
      .limit(1);
    if (!reference) {
      throw new Error("Payment reference link not found.");
    }

    const amount = parseMoney(reference.allocated_amount);

    await ctx.db.transaction(async (tx) => {
      if (reference.reference_type === "Sales Invoice") {
        const [invoice] = await tx
          .select()
          .from(accountingSalesInvoice)
          .where(eq(accountingSalesInvoice.id, referenceId))
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
          .where(eq(accountingPurchaseInvoice.id, referenceId))
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
      await tx
        .update(accountingPaymentEntry)
        .set({
          allocated_amount: toMoney(roundMoney(parseMoney(payment.allocated_amount) - amount)),
          unallocated_amount: toMoney(roundMoney(parseMoney(payment.unallocated_amount) + amount)),
          updated_at: new Date(),
        })
        .where(eq(accountingPaymentEntry.id, paymentId));
    });

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UNRECONCILED,
        crudAction: "update",
        entityId: paymentId,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT,
        newState: { referenceId },
      });
      await ctx.pubsub.publish(PAYMENT_EVENTS.UNRECONCILED, { paymentId });
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingPaymentEntry)
      .where(eq(accountingPaymentEntry.id, paymentId))
      .limit(1);
    return updated;
  });

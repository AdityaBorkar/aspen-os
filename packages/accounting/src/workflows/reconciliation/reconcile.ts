import { accountingPaymentEntry, accountingPaymentReference } from "#/db-schemas/payment";
import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { accountingSalesInvoice } from "#/db-schemas/sales";
import { PAYMENT_EVENTS, PURCHASE_INVOICE_EVENTS, SALES_INVOICE_EVENTS } from "#/pubsub";
import { ReconcileInputSchema } from "#/schemas/payment";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney, roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InputSchema = object({ input: ReconcileInputSchema });

export const reconcilePayment = Workflow.name("accounting.reconciliation.reconcile")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ReconcileInputSchema, input);

    const [payment] = await ctx.db
      .select()
      .from(accountingPaymentEntry)
      .where(eq(accountingPaymentEntry.id, parsed.paymentId))
      .limit(1);
    if (!payment) {
      throw new Error(`Payment entry "${parsed.paymentId}" not found.`);
    }
    if (payment.status !== "submitted") {
      throw new Error("Only submitted payments can be reconciled.");
    }
    if (payment.payment_type === "transfer") {
      throw new Error("Internal transfers cannot be reconciled to invoices.");
    }

    let available = parseMoney(payment.unallocated_amount);
    for (const allocation of parsed.allocations) {
      if (allocation.allocatedAmount <= 0) {
        throw new Error("Allocated amounts must be positive.");
      }
      if (allocation.allocatedAmount - available > 0.005) {
        throw new Error("Allocation exceeds payment unallocated amount.");
      }
      if (allocation.referenceType === "Sales Invoice") {
        const [invoice] = await ctx.db
          .select()
          .from(accountingSalesInvoice)
          .where(eq(accountingSalesInvoice.id, allocation.referenceId))
          .limit(1);
        if (!invoice) {
          throw new Error(`Sales invoice "${allocation.referenceId}" not found.`);
        }
        if (payment.party_id && invoice.customer_id !== payment.party_id) {
          throw new Error("Reconciliation requires the same party and control account.");
        }
        if (allocation.allocatedAmount - parseMoney(invoice.outstanding_amount) > 0.005) {
          throw new Error(
            `Allocation exceeds outstanding for invoice "${allocation.referenceId}".`,
          );
        }
      } else if (allocation.referenceType === "Purchase Invoice") {
        const [invoice] = await ctx.db
          .select()
          .from(accountingPurchaseInvoice)
          .where(eq(accountingPurchaseInvoice.id, allocation.referenceId))
          .limit(1);
        if (!invoice) {
          throw new Error(`Purchase invoice "${allocation.referenceId}" not found.`);
        }
        if (payment.party_id && invoice.supplier_id !== payment.party_id) {
          throw new Error("Reconciliation requires the same party and control account.");
        }
        if (allocation.allocatedAmount - parseMoney(invoice.outstanding_amount) > 0.005) {
          throw new Error(
            `Allocation exceeds outstanding for invoice "${allocation.referenceId}".`,
          );
        }
      } else {
        throw new Error(`Unsupported reference type "${allocation.referenceType}".`);
      }
      available = roundMoney(available - allocation.allocatedAmount);
    }

    const paidSales: string[] = [];
    const paidPurchases: string[] = [];

    await ctx.db.transaction(async (tx) => {
      let totalNew = 0;
      for (const allocation of parsed.allocations) {
        totalNew = roundMoney(totalNew + allocation.allocatedAmount);
        await tx.insert(accountingPaymentReference).values({
          allocated_amount: toMoney(allocation.allocatedAmount),
          payment_id: payment.id,
          reference_id: allocation.referenceId,
          reference_type: allocation.referenceType,
        });
        if (allocation.referenceType === "Sales Invoice") {
          const [invoice] = await tx
            .select()
            .from(accountingSalesInvoice)
            .where(eq(accountingSalesInvoice.id, allocation.referenceId))
            .limit(1);
          if (invoice) {
            const outstanding = roundMoney(
              parseMoney(invoice.outstanding_amount) - allocation.allocatedAmount,
            );
            const allocated = roundMoney(
              parseMoney(invoice.allocated_amount) + allocation.allocatedAmount,
            );
            let { status } = invoice;
            if (outstanding <= 0.005) {
              status = "paid";
              paidSales.push(invoice.id);
            } else if (allocated > 0.005) {
              status = "partly_paid";
            }
            await tx
              .update(accountingSalesInvoice)
              .set({
                allocated_amount: toMoney(allocated),
                outstanding_amount: toMoney(Math.max(0, outstanding)),
                status,
                updated_at: new Date(),
              })
              .where(eq(accountingSalesInvoice.id, invoice.id));
          }
        } else {
          const [invoice] = await tx
            .select()
            .from(accountingPurchaseInvoice)
            .where(eq(accountingPurchaseInvoice.id, allocation.referenceId))
            .limit(1);
          if (invoice) {
            const outstanding = roundMoney(
              parseMoney(invoice.outstanding_amount) - allocation.allocatedAmount,
            );
            const allocated = roundMoney(
              parseMoney(invoice.allocated_amount) + allocation.allocatedAmount,
            );
            let { status } = invoice;
            if (outstanding <= 0.005) {
              status = "paid";
              paidPurchases.push(invoice.id);
            } else if (allocated > 0.005) {
              status = "partly_paid";
            }
            await tx
              .update(accountingPurchaseInvoice)
              .set({
                allocated_amount: toMoney(allocated),
                outstanding_amount: toMoney(Math.max(0, outstanding)),
                status,
                updated_at: new Date(),
              })
              .where(eq(accountingPurchaseInvoice.id, invoice.id));
          }
        }
      }
      const nextAllocated = roundMoney(parseMoney(payment.allocated_amount) + totalNew);
      const nextUnallocated = roundMoney(parseMoney(payment.unallocated_amount) - totalNew);
      await tx
        .update(accountingPaymentEntry)
        .set({
          allocated_amount: toMoney(nextAllocated),
          unallocated_amount: toMoney(Math.max(0, nextUnallocated)),
          updated_at: new Date(),
        })
        .where(eq(accountingPaymentEntry.id, payment.id));
    });

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.RECONCILED,
        crudAction: "update",
        entityId: payment.id,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT,
        newState: { reconciled: true },
      });
      await ctx.pubsub.publish(PAYMENT_EVENTS.RECONCILED, { paymentId: payment.id });
      for (const salesInvoiceId of paidSales) {
        await ctx.pubsub.publish(SALES_INVOICE_EVENTS.PAID, { salesInvoiceId });
      }
      for (const purchaseInvoiceId of paidPurchases) {
        await ctx.pubsub.publish(PURCHASE_INVOICE_EVENTS.PAID, { purchaseInvoiceId });
      }
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingPaymentEntry)
      .where(eq(accountingPaymentEntry.id, payment.id))
      .limit(1);
    return updated;
  });

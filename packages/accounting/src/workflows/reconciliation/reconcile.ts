import { accountingPaymentEntry } from "#/db-schemas/payment";
import { PAYMENT_EVENTS, PURCHASE_INVOICE_EVENTS, SALES_INVOICE_EVENTS } from "#/pubsub";
import { ReconcileInputSchema } from "#/schemas/payment";
import {
  applyAllocationsToInvoices,
  insertAllocationReferences,
  validateAllocationTargets,
} from "#/services/allocation-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { GL_TOLERANCE, parseMoney, roundMoney, toMoney } from "#/utils/money";

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
      if (allocation.allocatedAmount - available > GL_TOLERANCE) {
        throw new Error("Allocation exceeds payment unallocated amount.");
      }
      available = roundMoney(available - allocation.allocatedAmount);
    }
    await validateAllocationTargets({
      allocations: parsed.allocations,
      db: ctx.db,
      partyId: payment.party_id,
    });

    let paidSales: string[] = [];
    let paidPurchases: string[] = [];

    await ctx.db.transaction(async (tx) => {
      await insertAllocationReferences({
        allocations: parsed.allocations,
        db: tx,
        paymentId: payment.id,
      });
      const applied = await applyAllocationsToInvoices({
        allocations: parsed.allocations,
        db: tx,
        paymentId: payment.id,
      });
      paidSales = applied.paidSales;
      paidPurchases = applied.paidPurchases;
      const nextAllocated = roundMoney(
        parseMoney(payment.allocated_amount) + applied.totalAllocated,
      );
      const nextUnallocated = roundMoney(
        parseMoney(payment.unallocated_amount) - applied.totalAllocated,
      );
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

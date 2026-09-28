import { accountingPaymentEntry } from "#/db-schemas/payment";
import { PAYMENT_EVENTS, PURCHASE_INVOICE_EVENTS, SALES_INVOICE_EVENTS } from "#/pubsub";
import { CreatePaymentEntrySchema } from "#/schemas/payment";
import { resolvePayableAccount, resolveReceivableAccount } from "#/services/accounts-service";
import {
  applyAllocationsToInvoices,
  insertAllocationReferences,
  validateAllocationTargets,
} from "#/services/allocation-service";
import { assertPeriodOpen } from "#/services/fiscal-service";
import { postGlEntries } from "#/services/gl-service";
import { assertLedgerAccount } from "#/services/invoice-common";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { GL_TOLERANCE, roundMoney, toMoney } from "#/utils/money";
import { normalizePartyType } from "#/utils/party";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreatePaymentEntrySchema });

export const createPaymentEntry = Workflow.name("accounting.payment.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePaymentEntrySchema, input);

    if (parsed.paidAmount <= 0) {
      throw new Error("Paid amount must be positive.");
    }
    if (parsed.paymentType !== "transfer" && !parsed.partyId) {
      throw new Error("Receive and Pay entries require a party.");
    }
    if (parsed.paymentType === "transfer" && parsed.partyId) {
      throw new Error("Internal transfers must not carry a party.");
    }
    const allocations = parsed.allocations ?? [];
    if (allocations.length > 0 && parsed.paymentType === "transfer") {
      throw new Error("Internal transfers cannot allocate to invoices.");
    }

    const year = await assertPeriodOpen({ db: ctx.db, postingDate: parsed.postingDate });

    let paidFrom = parsed.paidFrom ?? null;
    let paidTo = parsed.paidTo ?? null;

    if (parsed.paymentType === "receive") {
      if (!paidTo) {
        throw new Error("Receive entries require paidTo (bank/cash account).");
      }
      if (!paidFrom) {
        paidFrom = await resolveReceivableAccount(ctx.db);
      }
    } else if (parsed.paymentType === "pay") {
      if (!paidFrom) {
        throw new Error("Pay entries require paidFrom (bank/cash account).");
      }
      if (!paidTo) {
        paidTo = await resolvePayableAccount(ctx.db);
      }
    } else {
      if (!paidFrom || !paidTo) {
        throw new Error("Transfers require both paidFrom and paidTo bank/cash accounts.");
      }
      if (paidFrom === paidTo) {
        throw new Error("Transfer source and destination must differ.");
      }
    }

    if (!paidFrom || !paidTo) {
      throw new Error("Payment requires both paidFrom and paidTo accounts.");
    }

    await assertLedgerAccount(ctx.db, paidFrom, "paidFrom");
    await assertLedgerAccount(ctx.db, paidTo, "paidTo");

    let totalAllocated = 0;
    for (const allocation of allocations) {
      if (allocation.allocatedAmount <= 0) {
        throw new Error("Allocated amounts must be positive.");
      }
      totalAllocated = roundMoney(totalAllocated + allocation.allocatedAmount);
    }
    if (totalAllocated - parsed.paidAmount > GL_TOLERANCE) {
      throw new Error("Allocated amount cannot exceed paid amount.");
    }
    await validateAllocationTargets({ allocations, db: ctx.db, partyId: parsed.partyId ?? null });

    const unallocated = roundMoney(parsed.paidAmount - totalAllocated);
    const partyType = normalizePartyType(parsed.partyType);
    const partyId = parsed.partyId ?? null;

    let entryId = "";
    let paidSales: string[] = [];
    let paidPurchases: string[] = [];

    await ctx.db.transaction(async (tx) => {
      const [entry] = await tx
        .insert(accountingPaymentEntry)
        .values({
          allocated_amount: toMoney(totalAllocated),
          file_id: parsed.fileId ?? null,
          mode_of_payment: parsed.modeOfPayment ?? null,
          paid_amount: toMoney(parsed.paidAmount),
          paid_from: paidFrom,
          paid_to: paidTo,
          party_id: partyId,
          party_type: partyType,
          payment_type: parsed.paymentType,
          posting_date: parsed.postingDate,
          reference_date: parsed.referenceDate ?? null,
          reference_no: parsed.referenceNo ?? null,
          status: "submitted",
          unallocated_amount: toMoney(unallocated),
        })
        .returning();
      if (!entry) {
        throw new Error("Failed to create payment entry.");
      }
      entryId = entry.id;

      await insertAllocationReferences({ allocations, db: tx, paymentId: entry.id });
      const applied = await applyAllocationsToInvoices({
        allocations,
        db: tx,
        paymentId: entry.id,
      });
      paidSales = applied.paidSales;
      paidPurchases = applied.paidPurchases;

      await postGlEntries({
        db: tx,
        fiscalYear: year.name,
        postingDate: parsed.postingDate,
        rows: [
          { accountId: paidTo, credit: 0, debit: parsed.paidAmount, partyId, partyType },
          { accountId: paidFrom, credit: parsed.paidAmount, debit: 0, partyId, partyType },
        ],
        voucherId: entry.id,
        voucherType: "Payment Entry",
      });
    });

    const [entry] = await ctx.db
      .select()
      .from(accountingPaymentEntry)
      .where(eq(accountingPaymentEntry.id, entryId))
      .limit(1);
    const row = assertUpdated(entry, "Payment entry");

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT,
        newState: { paidAmount: parsed.paidAmount, paymentType: parsed.paymentType },
      });
      await ctx.pubsub.publish(PAYMENT_EVENTS.CREATED, { paymentId: row.id });
      for (const salesInvoiceId of paidSales) {
        await ctx.pubsub.publish(SALES_INVOICE_EVENTS.PAID, { salesInvoiceId });
      }
      for (const purchaseInvoiceId of paidPurchases) {
        await ctx.pubsub.publish(PURCHASE_INVOICE_EVENTS.PAID, { purchaseInvoiceId });
      }
    });

    return row;
  });

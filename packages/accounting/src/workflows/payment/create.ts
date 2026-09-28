import { accountingAccount } from "#/db-schemas/chart";
import { accountingPaymentEntry, accountingPaymentReference } from "#/db-schemas/payment";
import { accountingPurchaseInvoice as purchaseInvoiceTable } from "#/db-schemas/purchase";
import { accountingSalesInvoice } from "#/db-schemas/sales";
import { PAYMENT_EVENTS, PURCHASE_INVOICE_EVENTS, SALES_INVOICE_EVENTS } from "#/pubsub";
import { CreatePaymentEntrySchema } from "#/schemas/payment";
import { resolvePayableAccount, resolveReceivableAccount } from "#/services/accounts-service";
import { assertPeriodOpen } from "#/services/fiscal-service";
import { postGlEntries } from "#/services/gl-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, PARTY_TYPE } from "#/utils/constants";
import { parseMoney, roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreatePaymentEntrySchema });

function toPaymentPartyType(value: string | null | undefined): "customer" | "vendor" | null {
  if (value === PARTY_TYPE.CUSTOMER) {
    return PARTY_TYPE.CUSTOMER;
  }
  if (value === PARTY_TYPE.VENDOR) {
    return PARTY_TYPE.VENDOR;
  }
  return null;
}

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
    if ((parsed.allocations ?? []).length > 0 && parsed.paymentType === "transfer") {
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

    for (const accountId of [paidFrom, paidTo]) {
      if (!accountId) {
        continue;
      }
      const [account] = await ctx.db
        .select()
        .from(accountingAccount)
        .where(eq(accountingAccount.id, accountId))
        .limit(1);
      if (!account) {
        throw new Error(`Account "${accountId}" not found.`);
      }
      if (account.is_group) {
        throw new Error(`Group account "${account.name}" cannot post.`);
      }
      if (account.is_disabled) {
        throw new Error(`Account "${account.name}" is disabled.`);
      }
    }

    let totalAllocated = 0;
    const allocations = parsed.allocations ?? [];
    for (const allocation of allocations) {
      if (allocation.allocatedAmount <= 0) {
        throw new Error("Allocated amounts must be positive.");
      }
      totalAllocated = roundMoney(totalAllocated + allocation.allocatedAmount);
    }
    if (totalAllocated - parsed.paidAmount > 0.005) {
      throw new Error("Allocated amount cannot exceed paid amount.");
    }

    for (const allocation of allocations) {
      if (allocation.referenceType === "Sales Invoice") {
        const [invoice] = await ctx.db
          .select()
          .from(accountingSalesInvoice)
          .where(eq(accountingSalesInvoice.id, allocation.referenceId))
          .limit(1);
        if (!invoice) {
          throw new Error(`Sales invoice "${allocation.referenceId}" not found.`);
        }
        if (parsed.partyId && invoice.customer_id !== parsed.partyId) {
          throw new Error("One payment entry settles one party only.");
        }
        const outstanding = parseMoney(invoice.outstanding_amount);
        if (allocation.allocatedAmount - outstanding > 0.005) {
          throw new Error(
            `Allocation exceeds outstanding for invoice "${allocation.referenceId}".`,
          );
        }
      } else if (allocation.referenceType === "Purchase Invoice") {
        const [invoice] = await ctx.db
          .select()
          .from(purchaseInvoiceTable)
          .where(eq(purchaseInvoiceTable.id, allocation.referenceId))
          .limit(1);
        if (!invoice) {
          throw new Error(`Purchase invoice "${allocation.referenceId}" not found.`);
        }
        if (invoice.on_hold) {
          throw new Error(
            `Purchase invoice "${allocation.referenceId}" is on hold and excluded from payment.`,
          );
        }
        if (parsed.partyId && invoice.supplier_id !== parsed.partyId) {
          throw new Error("One payment entry settles one party only.");
        }
        const outstanding = parseMoney(invoice.outstanding_amount);
        if (allocation.allocatedAmount - outstanding > 0.005) {
          throw new Error(
            `Allocation exceeds outstanding for invoice "${allocation.referenceId}".`,
          );
        }
      } else {
        throw new Error(`Unsupported reference type "${allocation.referenceType}".`);
      }
    }

    const unallocated = roundMoney(parsed.paidAmount - totalAllocated);

    const [entry] = await ctx.db
      .insert(accountingPaymentEntry)
      .values({
        allocated_amount: toMoney(totalAllocated),
        file_id: parsed.fileId ?? null,
        mode_of_payment: parsed.modeOfPayment ?? null,
        paid_amount: toMoney(parsed.paidAmount),
        paid_from: paidFrom,
        paid_to: paidTo,
        party_id: parsed.partyId ?? null,
        party_type: toPaymentPartyType(parsed.partyType),
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

    const paidSales: string[] = [];
    const paidPurchases: string[] = [];

    await ctx.db.transaction(async (tx) => {
      if (allocations.length > 0) {
        await tx.insert(accountingPaymentReference).values(
          allocations.map((allocation) => ({
            allocated_amount: toMoney(allocation.allocatedAmount),
            payment_id: entry.id,
            reference_id: allocation.referenceId,
            reference_type: allocation.referenceType,
          })),
        );
      }

      for (const allocation of allocations) {
        if (allocation.referenceType === "Sales Invoice") {
          const [invoice] = await tx
            .select()
            .from(accountingSalesInvoice)
            .where(eq(accountingSalesInvoice.id, allocation.referenceId))
            .limit(1);
          if (!invoice) {
            continue;
          }
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
        } else {
          const [invoice] = await tx
            .select()
            .from(purchaseInvoiceTable)
            .where(eq(purchaseInvoiceTable.id, allocation.referenceId))
            .limit(1);
          if (!invoice) {
            continue;
          }
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
            .update(purchaseInvoiceTable)
            .set({
              allocated_amount: toMoney(allocated),
              outstanding_amount: toMoney(Math.max(0, outstanding)),
              status,
              updated_at: new Date(),
            })
            .where(eq(purchaseInvoiceTable.id, invoice.id));
        }
      }

      const partyType = parsed.partyType ?? null;
      const partyId = parsed.partyId ?? null;
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

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: entry.id,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT,
        newState: { paidAmount: parsed.paidAmount, paymentType: parsed.paymentType },
      });
      await ctx.pubsub.publish(PAYMENT_EVENTS.CREATED, { paymentId: entry.id });
      for (const salesInvoiceId of paidSales) {
        await ctx.pubsub.publish(SALES_INVOICE_EVENTS.PAID, { salesInvoiceId });
      }
      for (const purchaseInvoiceId of paidPurchases) {
        await ctx.pubsub.publish(PURCHASE_INVOICE_EVENTS.PAID, { purchaseInvoiceId });
      }
    });

    return entry;
  });

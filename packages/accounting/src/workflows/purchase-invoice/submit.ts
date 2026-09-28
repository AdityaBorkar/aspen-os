import {
  accountingPurchaseInvoice,
  accountingPurchaseInvoiceItem,
  accountingPurchaseOrder,
  accountingPurchaseOrderItem,
} from "#/db-schemas/purchase";
import { DEBIT_NOTE_EVENTS, PURCHASE_INVOICE_EVENTS } from "#/pubsub";
import {
  resolveControlAccount,
  resolveExpenseAccount,
  resolvePayableAccount,
} from "#/services/accounts-service";
import { assertPeriodOpen } from "#/services/fiscal-service";
import { postGlEntries } from "#/services/gl-service";
import { computeDocumentTotals } from "#/services/totals-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney, roundMoney, toMoney } from "#/utils/money";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const submitPurchaseInvoice = Workflow.name("accounting.purchase-invoice.submit")
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
    if (invoice.status !== "draft") {
      throw new Error("Only draft purchase invoices can be submitted.");
    }

    const year = await assertPeriodOpen({ db: ctx.db, postingDate: invoice.posting_date });

    const items = await ctx.db
      .select()
      .from(accountingPurchaseInvoiceItem)
      .where(eq(accountingPurchaseInvoiceItem.purchase_invoice_id, id));

    const payableAccount = invoice.credit_to ?? (await resolvePayableAccount(ctx.db));
    const defaultExpense = await resolveExpenseAccount(ctx.db);
    const stockAccount = invoice.receipt_id
      ? await resolveControlAccount({ accountType: "stock", db: ctx.db, label: "stock" }).catch(
          () => defaultExpense,
        )
      : defaultExpense;

    const totals = await computeDocumentTotals({
      db: ctx.db,
      lines: items.map((item) => ({
        discountAmount: parseMoney(item.discount_amount),
        discountPercent: parseMoney(item.discount_percent),
        itemTaxTemplateId: item.item_tax_template_id,
        qty: parseMoney(item.qty),
        rate: parseMoney(item.rate),
      })),
      taxTemplateId: invoice.tax_template_id,
    });

    const grandTotal = parseMoney(invoice.grand_total);

    await ctx.db.transaction(async (tx) => {
      const rows: {
        accountId: string;
        credit?: number;
        debit?: number;
        partyId?: string | null;
        partyType?: string | null;
      }[] = [];
      if (invoice.is_return) {
        rows.push({
          accountId: payableAccount,
          debit: Math.abs(grandTotal),
          partyId: invoice.supplier_id,
          partyType: "vendor",
        });
        const byAccount = new Map<string, number>();
        for (const item of items) {
          const key = item.expense_account ?? stockAccount;
          byAccount.set(key, roundMoney((byAccount.get(key) ?? 0) + parseMoney(item.amount)));
        }
        for (const [accountId, amount] of byAccount) {
          rows.push({ accountId, credit: Math.abs(amount) });
        }
        for (const tax of totals.taxRows) {
          rows.push({ accountId: tax.accountHead, credit: Math.abs(tax.amount) });
        }
      } else {
        rows.push({
          accountId: payableAccount,
          credit: grandTotal,
          partyId: invoice.supplier_id,
          partyType: "vendor",
        });
        const byAccount = new Map<string, number>();
        for (const item of items) {
          const key = item.expense_account ?? stockAccount;
          byAccount.set(key, roundMoney((byAccount.get(key) ?? 0) + parseMoney(item.amount)));
        }
        for (const [accountId, amount] of byAccount) {
          rows.push({ accountId, debit: roundMoney(Math.abs(amount)) });
        }
        for (const tax of totals.taxRows) {
          rows.push({ accountId: tax.accountHead, debit: tax.amount });
        }
      }

      await postGlEntries({
        db: tx,
        fiscalYear: year.name,
        postingDate: invoice.posting_date,
        rows,
        voucherId: id,
        voucherType: "Purchase Invoice",
      });

      await tx
        .update(accountingPurchaseInvoice)
        .set({ outstanding_amount: invoice.grand_total, status: "unpaid", updated_at: new Date() })
        .where(eq(accountingPurchaseInvoice.id, id));

      if (invoice.is_return && invoice.return_against) {
        const [original] = await tx
          .select()
          .from(accountingPurchaseInvoice)
          .where(eq(accountingPurchaseInvoice.id, invoice.return_against))
          .limit(1);
        if (original) {
          const credit = Math.abs(parseMoney(invoice.grand_total));
          const nextOutstanding = roundMoney(parseMoney(original.outstanding_amount) - credit);
          let originalStatus = original.status;
          if (nextOutstanding <= 0.005) {
            originalStatus = "paid";
          } else if (nextOutstanding < parseMoney(original.grand_total)) {
            originalStatus = "partly_paid";
          }
          await tx
            .update(accountingPurchaseInvoice)
            .set({
              outstanding_amount: toMoney(Math.max(0, nextOutstanding)),
              status: originalStatus,
              updated_at: new Date(),
            })
            .where(eq(accountingPurchaseInvoice.id, original.id));
          await tx
            .update(accountingPurchaseInvoice)
            .set({ outstanding_amount: "0", status: "paid", updated_at: new Date() })
            .where(eq(accountingPurchaseInvoice.id, id));
        }
      }

      if (invoice.purchase_order_id) {
        const orderItems = await tx
          .select()
          .from(accountingPurchaseOrderItem)
          .where(eq(accountingPurchaseOrderItem.purchase_order_id, invoice.purchase_order_id));
        for (const billed of items) {
          const match = orderItems.find((candidate) => candidate.item_id === billed.item_id);
          if (match) {
            const next = roundMoney(parseMoney(match.billed_qty) + parseMoney(billed.qty));
            await tx
              .update(accountingPurchaseOrderItem)
              .set({ billed_qty: String(next) })
              .where(eq(accountingPurchaseOrderItem.id, match.id));
          }
        }
        const [order] = await tx
          .select()
          .from(accountingPurchaseOrder)
          .where(eq(accountingPurchaseOrder.id, invoice.purchase_order_id))
          .limit(1);
        if (order) {
          let totalQty = 0;
          let billedQty = 0;
          const refreshed = await tx
            .select()
            .from(accountingPurchaseOrderItem)
            .where(eq(accountingPurchaseOrderItem.purchase_order_id, invoice.purchase_order_id));
          for (const row of refreshed) {
            totalQty += parseMoney(row.qty);
            billedQty += parseMoney(row.billed_qty);
          }
          const billedPercent = totalQty > 0 ? roundMoney((billedQty / totalQty) * 100) : 0;
          const receivedPercent = parseMoney(order.received_percent);
          let { status } = order;
          if (billedPercent >= 100 && receivedPercent >= 100) {
            status = "completed";
          } else if (billedPercent >= 100) {
            status = "to_receive";
          } else if (receivedPercent >= 100) {
            status = "to_bill";
          }
          await tx
            .update(accountingPurchaseOrder)
            .set({ billed_percent: String(billedPercent), status, updated_at: new Date() })
            .where(eq(accountingPurchaseOrder.id, order.id));
        }
      }
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingPurchaseInvoice)
      .where(eq(accountingPurchaseInvoice.id, id))
      .limit(1);
    const row = assertUpdated(updated, `Purchase invoice "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SUBMITTED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { status: "unpaid" },
      });
      if (invoice.is_return) {
        await ctx.pubsub.publish(DEBIT_NOTE_EVENTS.ISSUED, {
          purchaseInvoiceId: id,
          sourceInvoiceId: invoice.return_against,
        });
      } else {
        await ctx.pubsub.publish(PURCHASE_INVOICE_EVENTS.CREATED, { purchaseInvoiceId: id });
      }
    });

    return row;
  });

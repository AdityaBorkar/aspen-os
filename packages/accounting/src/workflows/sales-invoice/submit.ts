import {
  accountingSalesInvoice,
  accountingSalesInvoiceItem,
  accountingSalesOrder,
  accountingSalesOrderItem,
} from "#/db-schemas/sales";
import { CREDIT_NOTE_EVENTS, SALES_INVOICE_EVENTS } from "#/pubsub";
import { resolveIncomeAccount, resolveReceivableAccount } from "#/services/accounts-service";
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

export const submitSalesInvoice = Workflow.name("accounting.sales-invoice.submit")
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
    if (invoice.status !== "draft") {
      throw new Error("Only draft sales invoices can be submitted.");
    }

    const year = await assertPeriodOpen({ db: ctx.db, postingDate: invoice.posting_date });

    const items = await ctx.db
      .select()
      .from(accountingSalesInvoiceItem)
      .where(eq(accountingSalesInvoiceItem.sales_invoice_id, id));

    const receivableAccount = await resolveReceivableAccount(ctx.db);
    const defaultIncome = await resolveIncomeAccount(ctx.db);

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
    const netTotal = parseMoney(invoice.net_total);

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
          accountId: receivableAccount,
          credit: Math.abs(grandTotal),
          partyId: invoice.customer_id,
          partyType: "customer",
        });
        rows.push({
          accountId: defaultIncome,
          debit: Math.abs(netTotal),
          partyId: invoice.customer_id,
          partyType: "customer",
        });
        for (const tax of totals.taxRows) {
          rows.push({ accountId: tax.accountHead, credit: 0, debit: Math.abs(tax.amount) });
        }
      } else {
        rows.push({
          accountId: receivableAccount,
          debit: grandTotal,
          partyId: invoice.customer_id,
          partyType: "customer",
        });
        const incomeByAccount = new Map<string, number>();
        for (const item of items) {
          const key = item.income_account ?? defaultIncome;
          incomeByAccount.set(
            key,
            roundMoney((incomeByAccount.get(key) ?? 0) + parseMoney(item.amount)),
          );
        }
        for (const [accountId, amount] of incomeByAccount) {
          rows.push({ accountId, credit: roundMoney(Math.abs(amount)) });
        }
        for (const tax of totals.taxRows) {
          rows.push({ accountId: tax.accountHead, credit: tax.amount });
        }
      }

      await postGlEntries({
        db: tx,
        fiscalYear: year.name,
        postingDate: invoice.posting_date,
        rows,
        voucherId: id,
        voucherType: "Sales Invoice",
      });

      await tx
        .update(accountingSalesInvoice)
        .set({ outstanding_amount: invoice.grand_total, status: "unpaid", updated_at: new Date() })
        .where(eq(accountingSalesInvoice.id, id));

      if (invoice.is_return && invoice.return_against) {
        const [original] = await tx
          .select()
          .from(accountingSalesInvoice)
          .where(eq(accountingSalesInvoice.id, invoice.return_against))
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
            .update(accountingSalesInvoice)
            .set({
              outstanding_amount: toMoney(Math.max(0, nextOutstanding)),
              status: originalStatus,
              updated_at: new Date(),
            })
            .where(eq(accountingSalesInvoice.id, original.id));
          await tx
            .update(accountingSalesInvoice)
            .set({ outstanding_amount: "0", status: "paid", updated_at: new Date() })
            .where(eq(accountingSalesInvoice.id, id));
        }
      }

      if (invoice.sales_order_id) {
        const orderItems = await tx
          .select()
          .from(accountingSalesOrderItem)
          .where(eq(accountingSalesOrderItem.sales_order_id, invoice.sales_order_id));
        for (const billed of items) {
          const match = orderItems.find((candidate) => candidate.item_id === billed.item_id);
          if (match) {
            const next = roundMoney(parseMoney(match.billed_qty) + parseMoney(billed.qty));
            await tx
              .update(accountingSalesOrderItem)
              .set({ billed_qty: String(next) })
              .where(eq(accountingSalesOrderItem.id, match.id));
          }
        }
        const [order] = await tx
          .select()
          .from(accountingSalesOrder)
          .where(eq(accountingSalesOrder.id, invoice.sales_order_id))
          .limit(1);
        if (order) {
          let totalQty = 0;
          let billedQty = 0;
          const refreshed = await tx
            .select()
            .from(accountingSalesOrderItem)
            .where(eq(accountingSalesOrderItem.sales_order_id, invoice.sales_order_id));
          for (const row of refreshed) {
            totalQty += parseMoney(row.qty);
            billedQty += parseMoney(row.billed_qty);
          }
          const billedPercent = totalQty > 0 ? roundMoney((billedQty / totalQty) * 100) : 0;
          const deliveredPercent = parseMoney(order.delivered_percent);
          let { status } = order;
          if (billedPercent >= 100 && deliveredPercent >= 100) {
            status = "completed";
          } else if (billedPercent >= 100) {
            status = "to_deliver";
          } else if (deliveredPercent >= 100) {
            status = "to_bill";
          }
          await tx
            .update(accountingSalesOrder)
            .set({ billed_percent: String(billedPercent), status, updated_at: new Date() })
            .where(eq(accountingSalesOrder.id, order.id));
        }
      }
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingSalesInvoice)
      .where(eq(accountingSalesInvoice.id, id))
      .limit(1);
    const row = assertUpdated(updated, `Sales invoice "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SUBMITTED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { status: "unpaid" },
      });
      if (invoice.is_return) {
        await ctx.pubsub.publish(CREDIT_NOTE_EVENTS.ISSUED, {
          salesInvoiceId: id,
          sourceInvoiceId: invoice.return_against,
        });
      } else {
        await ctx.pubsub.publish(SALES_INVOICE_EVENTS.CREATED, { salesInvoiceId: id });
      }
    });

    return row;
  });

import { accountingSalesInvoice, accountingSalesInvoiceItem } from "#/db-schemas/sales";
import { CREDIT_NOTE_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { roundMoney, toMoney, parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { boolean, minLength, nullable, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  id: string(),
  isRateAdjustment: optional(boolean(), false),
  items: optional(nullable(string())),
  reason: optional(nullable(pipe(string(), minLength(1)))),
});

export const createCreditNote = Workflow.name("accounting.sales-invoice.credit-note")
  .input(InputSchema)
  .handler(async ({ id, isRateAdjustment }, ctx) => {
    const [original] = await ctx.db
      .select()
      .from(accountingSalesInvoice)
      .where(eq(accountingSalesInvoice.id, id))
      .limit(1);
    if (!original) {
      throw new Error(`Sales invoice "${id}" not found.`);
    }
    if (original.status === "draft" || original.status === "cancelled") {
      throw new Error("Credit notes require a submitted invoice.");
    }

    const originalItems = await ctx.db
      .select()
      .from(accountingSalesInvoiceItem)
      .where(eq(accountingSalesInvoiceItem.sales_invoice_id, id));

    const [note] = await ctx.db
      .insert(accountingSalesInvoice)
      .values({
        allocated_amount: "0",
        currency: original.currency,
        customer_id: original.customer_id,
        customer_po_date: original.customer_po_date,
        customer_po_no: original.customer_po_no,
        delivery_id: original.delivery_id,
        due_date: original.due_date,
        grand_total: toMoney(roundMoney(-parseMoney(original.grand_total))),
        is_rate_adjustment: isRateAdjustment ?? false,
        is_return: !(isRateAdjustment ?? false),
        net_total: toMoney(roundMoney(-parseMoney(original.net_total))),
        outstanding_amount: toMoney(roundMoney(-parseMoney(original.grand_total))),
        payment_terms_template_id: original.payment_terms_template_id,
        posting_date: original.posting_date,
        return_against: id,
        sales_order_id: original.sales_order_id,
        status: "draft",
        tax_template_id: original.tax_template_id,
        tax_total: toMoney(roundMoney(-parseMoney(original.tax_total))),
        terms_text: original.terms_text,
        update_stock: false,
        warehouse_id: original.warehouse_id,
        written_off_amount: "0",
      })
      .returning();

    if (!note) {
      throw new Error("Failed to create credit note.");
    }

    if (originalItems.length > 0) {
      await ctx.db.insert(accountingSalesInvoiceItem).values(
        originalItems.map((item) => ({
          amount: toMoney(roundMoney(-parseMoney(item.amount))),
          delivery_id: item.delivery_id,
          discount_amount: item.discount_amount,
          discount_percent: item.discount_percent,
          income_account: item.income_account,
          item_id: item.item_id,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          sales_invoice_id: note.id,
          sales_order_id: item.sales_order_id,
          sales_order_item_id: item.sales_order_item_id,
          uom: item.uom,
          uom_factor: item.uom_factor,
          warehouse_id: item.warehouse_id,
        })),
      );
    }

    await ctx.db
      .update(accountingSalesInvoice)
      .set({ status: "credit_note_issued", updated_at: new Date() })
      .where(eq(accountingSalesInvoice.id, id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: note.id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { returnAgainst: id },
      });
      await ctx.pubsub.publish(CREDIT_NOTE_EVENTS.ISSUED, {
        salesInvoiceId: note.id,
        sourceInvoiceId: id,
      });
    });

    return note;
  });

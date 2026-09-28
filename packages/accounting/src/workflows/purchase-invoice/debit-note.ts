import { accountingPurchaseInvoice, accountingPurchaseInvoiceItem } from "#/db-schemas/purchase";
import { DEBIT_NOTE_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney, roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const createDebitNote = Workflow.name("accounting.purchase-invoice.debit-note")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [original] = await ctx.db
      .select()
      .from(accountingPurchaseInvoice)
      .where(eq(accountingPurchaseInvoice.id, id))
      .limit(1);
    if (!original) {
      throw new Error(`Purchase invoice "${id}" not found.`);
    }
    if (original.status === "draft" || original.status === "cancelled") {
      throw new Error("Debit notes require a submitted invoice.");
    }

    const originalItems = await ctx.db
      .select()
      .from(accountingPurchaseInvoiceItem)
      .where(eq(accountingPurchaseInvoiceItem.purchase_invoice_id, id));

    const [note] = await ctx.db
      .insert(accountingPurchaseInvoice)
      .values({
        allocated_amount: "0",
        credit_to: original.credit_to,
        currency: original.currency,
        due_date: original.due_date,
        grand_total: toMoney(roundMoney(-parseMoney(original.grand_total))),
        is_return: true,
        net_total: toMoney(roundMoney(-parseMoney(original.net_total))),
        on_hold: false,
        outstanding_amount: toMoney(roundMoney(-parseMoney(original.grand_total))),
        posting_date: original.posting_date,
        purchase_order_id: original.purchase_order_id,
        receipt_id: original.receipt_id,
        return_against: id,
        status: "draft",
        supplier_id: original.supplier_id,
        supplier_invoice_date: original.supplier_invoice_date,
        supplier_invoice_no: original.supplier_invoice_no
          ? `${original.supplier_invoice_no}-R`
          : null,
        tax_template_id: original.tax_template_id,
        tax_total: toMoney(roundMoney(-parseMoney(original.tax_total))),
        terms_text: original.terms_text,
        update_stock: false,
        withholding_rate: original.withholding_rate,
        written_off_amount: "0",
      })
      .returning();

    if (!note) {
      throw new Error("Failed to create debit note.");
    }

    if (originalItems.length > 0) {
      await ctx.db.insert(accountingPurchaseInvoiceItem).values(
        originalItems.map((item) => ({
          amount: toMoney(roundMoney(-parseMoney(item.amount))),
          discount_amount: item.discount_amount,
          discount_percent: item.discount_percent,
          expense_account: item.expense_account,
          item_id: item.item_id,
          item_name: item.item_name,
          purchase_invoice_id: note.id,
          purchase_order_id: item.purchase_order_id,
          purchase_order_item_id: item.purchase_order_item_id,
          qty: item.qty,
          rate: item.rate,
          receipt_id: item.receipt_id,
          uom: item.uom,
          uom_factor: item.uom_factor,
          warehouse_id: item.warehouse_id,
        })),
      );
    }

    await ctx.db
      .update(accountingPurchaseInvoice)
      .set({ status: "debit_note_issued", updated_at: new Date() })
      .where(eq(accountingPurchaseInvoice.id, id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: note.id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { returnAgainst: id },
      });
      await ctx.pubsub.publish(DEBIT_NOTE_EVENTS.ISSUED, {
        purchaseInvoiceId: note.id,
        sourceInvoiceId: id,
      });
    });

    return note;
  });

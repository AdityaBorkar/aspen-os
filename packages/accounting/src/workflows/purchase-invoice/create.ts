import { accountingPurchaseInvoice, accountingPurchaseInvoiceItem } from "#/db-schemas/purchase";
import { PURCHASE_INVOICE_EVENTS } from "#/pubsub";
import { CreatePurchaseInvoiceSchema } from "#/schemas/purchase";
import { computeDocumentTotals, lineAmount } from "#/services/totals-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreatePurchaseInvoiceSchema });

export const createPurchaseInvoice = Workflow.name("accounting.purchase-invoice.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePurchaseInvoiceSchema, input);

    if (parsed.updateStock && parsed.receiptId) {
      throw new Error(
        "update_stock invoice is forbidden when a receipt already moved the quantity.",
      );
    }

    if (parsed.supplierInvoiceNo) {
      const [duplicate] = await ctx.db
        .select({ id: accountingPurchaseInvoice.id })
        .from(accountingPurchaseInvoice)
        .where(
          and(
            eq(accountingPurchaseInvoice.supplier_id, parsed.supplierId),
            eq(accountingPurchaseInvoice.supplier_invoice_no, parsed.supplierInvoiceNo),
          ),
        )
        .limit(1);
      if (duplicate) {
        throw new Error(
          `Supplier invoice number "${parsed.supplierInvoiceNo}" already exists for this supplier.`,
        );
      }
    }

    const totals = await computeDocumentTotals({
      db: ctx.db,
      lines: parsed.items.map((item) => ({
        discountAmount: item.discountAmount ?? 0,
        discountPercent: item.discountPercent ?? 0,
        itemTaxTemplateId: item.itemTaxTemplateId ?? null,
        qty: item.qty ?? 1,
        rate: item.rate ?? 0,
      })),
      taxTemplateId: parsed.taxTemplateId ?? null,
    });

    const sign = parsed.isReturn ? -1 : 1;

    const [invoice] = await ctx.db
      .insert(accountingPurchaseInvoice)
      .values({
        allocated_amount: "0",
        credit_to: parsed.creditTo ?? null,
        currency: "INR",
        due_date: parsed.dueDate ?? null,
        file_id: parsed.fileId ?? null,
        grand_total: toMoney(roundMoney(totals.grandTotal * sign)),
        is_return: parsed.isReturn ?? false,
        net_total: toMoney(roundMoney(totals.netTotal * sign)),
        on_hold: parsed.onHold ?? false,
        outstanding_amount: toMoney(roundMoney(totals.grandTotal * sign)),
        posting_date: parsed.postingDate,
        purchase_order_id: parsed.purchaseOrderId ?? null,
        receipt_id: parsed.receiptId ?? null,
        return_against: parsed.returnAgainst ?? null,
        status: "draft",
        supplier_id: parsed.supplierId,
        supplier_invoice_date: parsed.supplierInvoiceDate ?? null,
        supplier_invoice_no: parsed.supplierInvoiceNo ?? null,
        tax_template_id: parsed.taxTemplateId ?? null,
        tax_total: toMoney(roundMoney(totals.taxTotal * sign)),
        terms_text: parsed.termsText ?? null,
        update_stock: parsed.updateStock ?? false,
        withholding_rate: toMoney(parsed.withholdingRate ?? 0),
        written_off_amount: "0",
      })
      .returning();

    if (!invoice) {
      throw new Error("Failed to create purchase invoice.");
    }

    await ctx.db.insert(accountingPurchaseInvoiceItem).values(
      parsed.items.map((item) => ({
        amount: toMoney(roundMoney(lineAmount(item) * sign)),
        discount_amount: toMoney(item.discountAmount ?? 0),
        discount_percent: toMoney(item.discountPercent ?? 0),
        expense_account: item.expenseAccount ?? null,
        item_id: item.itemId,
        item_name: item.itemName ?? null,
        item_tax_template_id: item.itemTaxTemplateId ?? null,
        purchase_invoice_id: invoice.id,
        purchase_order_id: parsed.purchaseOrderId ?? null,
        purchase_order_item_id: null,
        qty: toMoney(item.qty ?? 1),
        rate: toMoney(item.rate ?? 0),
        receipt_id: parsed.receiptId ?? null,
        uom: item.uom ?? null,
        uom_factor: toMoney(item.uomFactor ?? 1),
        warehouse_id: item.warehouseId ?? null,
      })),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: invoice.id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { status: invoice.status, supplierId: invoice.supplier_id },
      });
      await ctx.pubsub.publish(PURCHASE_INVOICE_EVENTS.CREATED, { purchaseInvoiceId: invoice.id });
    });

    return invoice;
  });

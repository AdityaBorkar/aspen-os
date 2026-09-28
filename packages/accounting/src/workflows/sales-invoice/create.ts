import { accountingSalesInvoice, accountingSalesInvoiceItem } from "#/db-schemas/sales";
import { SALES_INVOICE_EVENTS } from "#/pubsub";
import { CreateSalesInvoiceSchema } from "#/schemas/sales";
import { deriveDueDate } from "#/services/payment-terms-service";
import { computeDocumentTotals, lineAmount } from "#/services/totals-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateSalesInvoiceSchema });

export const createSalesInvoice = Workflow.name("accounting.sales-invoice.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateSalesInvoiceSchema, input);

    if (parsed.updateStock && parsed.deliveryId) {
      throw new Error(
        "update_stock invoice is forbidden when a delivery note already moved the quantity.",
      );
    }

    const dueDate = await deriveDueDate({
      db: ctx.db,
      dueDate: parsed.dueDate ?? null,
      paymentTermsTemplateId: parsed.paymentTermsTemplateId ?? null,
      postingDate: parsed.postingDate,
    });

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
    const grandTotal = roundMoney(totals.grandTotal * sign);
    const netTotal = roundMoney(totals.netTotal * sign);
    const taxTotal = roundMoney(totals.taxTotal * sign);

    const [invoice] = await ctx.db
      .insert(accountingSalesInvoice)
      .values({
        allocated_amount: "0",
        currency: "INR",
        customer_id: parsed.customerId,
        customer_po_date: parsed.customerPoDate ?? null,
        customer_po_no: parsed.customerPoNo ?? null,
        delivery_id: parsed.deliveryId ?? null,
        due_date: dueDate,
        file_id: parsed.fileId ?? null,
        grand_total: toMoney(grandTotal),
        is_rate_adjustment: parsed.isRateAdjustment ?? false,
        is_return: parsed.isReturn ?? false,
        net_total: toMoney(netTotal),
        outstanding_amount: toMoney(grandTotal),
        payment_terms_template_id: parsed.paymentTermsTemplateId ?? null,
        posting_date: parsed.postingDate,
        return_against: parsed.returnAgainst ?? null,
        sales_order_id: parsed.salesOrderId ?? null,
        status: "draft",
        tax_template_id: parsed.taxTemplateId ?? null,
        tax_total: toMoney(taxTotal),
        terms_text: parsed.termsText ?? null,
        update_stock: parsed.updateStock ?? false,
        warehouse_id: parsed.warehouseId ?? null,
        written_off_amount: "0",
      })
      .returning();

    if (!invoice) {
      throw new Error("Failed to create sales invoice.");
    }

    await ctx.db.insert(accountingSalesInvoiceItem).values(
      parsed.items.map((item) => ({
        amount: toMoney(roundMoney(lineAmount(item) * sign)),
        delivery_id: parsed.deliveryId ?? null,
        discount_amount: toMoney(item.discountAmount ?? 0),
        discount_percent: toMoney(item.discountPercent ?? 0),
        income_account: item.incomeAccount ?? null,
        item_id: item.itemId,
        item_name: item.itemName ?? null,
        item_tax_template_id: item.itemTaxTemplateId ?? null,
        qty: toMoney(item.qty ?? 1),
        rate: toMoney(item.rate ?? 0),
        sales_invoice_id: invoice.id,
        sales_order_id: parsed.salesOrderId ?? null,
        sales_order_item_id: null,
        uom: item.uom ?? null,
        uom_factor: toMoney(item.uomFactor ?? 1),
        warehouse_id: item.warehouseId ?? parsed.warehouseId ?? null,
      })),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: invoice.id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { customerId: invoice.customer_id, grandTotal },
      });
      await ctx.pubsub.publish(SALES_INVOICE_EVENTS.CREATED, { salesInvoiceId: invoice.id });
    });

    return invoice;
  });

import { accountingSalesOrder, accountingSalesOrderItem } from "#/db-schemas/sales";
import { SALES_ORDER_EVENTS } from "#/pubsub";
import { CreateSalesOrderSchema } from "#/schemas/sales";
import { computeDocumentTotals, lineAmount } from "#/services/totals-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateSalesOrderSchema });

export const createSalesOrder = Workflow.name("accounting.sales-order.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateSalesOrderSchema, input);

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

    const [order] = await ctx.db
      .insert(accountingSalesOrder)
      .values({
        billed_percent: "0",
        currency: "INR",
        customer_id: parsed.customerId,
        customer_po_date: parsed.customerPoDate ?? null,
        customer_po_no: parsed.customerPoNo ?? null,
        delivered_percent: "0",
        delivery_date: parsed.deliveryDate ?? null,
        file_id: parsed.fileId ?? null,
        grand_total: toMoney(totals.grandTotal),
        net_total: toMoney(totals.netTotal),
        payment_terms_template_id: parsed.paymentTermsTemplateId ?? null,
        quotation_id: parsed.quotationId ?? null,
        status: "draft",
        tax_template_id: parsed.taxTemplateId ?? null,
        tax_total: toMoney(totals.taxTotal),
        terms_text: parsed.termsText ?? null,
        warehouse_id: parsed.warehouseId ?? null,
      })
      .returning();

    if (!order) {
      throw new Error("Failed to create sales order.");
    }

    await ctx.db.insert(accountingSalesOrderItem).values(
      parsed.items.map((item) => ({
        amount: toMoney(roundMoney(lineAmount(item))),
        billed_qty: "0",
        delivered_qty: "0",
        discount_amount: toMoney(item.discountAmount ?? 0),
        discount_percent: toMoney(item.discountPercent ?? 0),
        income_account: item.incomeAccount ?? null,
        item_id: item.itemId,
        item_name: item.itemName ?? null,
        item_tax_template_id: item.itemTaxTemplateId ?? null,
        qty: toMoney(item.qty ?? 1),
        rate: toMoney(item.rate ?? 0),
        sales_order_id: order.id,
        uom: item.uom ?? null,
        uom_factor: toMoney(item.uomFactor ?? 1),
        warehouse_id: item.warehouseId ?? parsed.warehouseId ?? null,
      })),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: order.id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { customerId: order.customer_id, status: order.status },
      });
      await ctx.pubsub.publish(SALES_ORDER_EVENTS.CREATED, { salesOrderId: order.id });
    });

    return order;
  });

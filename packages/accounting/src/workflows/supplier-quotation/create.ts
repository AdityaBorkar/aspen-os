import {
  accountingSupplierQuotation,
  accountingSupplierQuotationItem,
} from "#/db-schemas/purchase";
import { SUPPLIER_QUOTATION_EVENTS } from "#/pubsub";
import { CreateSupplierQuotationSchema } from "#/schemas/purchase";
import { computeDocumentTotals, lineAmount } from "#/services/totals-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateSupplierQuotationSchema });

export const createSupplierQuotation = Workflow.name("accounting.supplier-quotation.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateSupplierQuotationSchema, input);

    const totals = await computeDocumentTotals({
      db: ctx.db,
      lines: parsed.items.map((item) => ({
        discountAmount: 0,
        discountPercent: 0,
        itemTaxTemplateId: item.itemTaxTemplateId ?? null,
        qty: item.qty ?? 1,
        rate: item.rate ?? 0,
      })),
      taxTemplateId: parsed.taxTemplateId ?? null,
    });

    const [quotation] = await ctx.db
      .insert(accountingSupplierQuotation)
      .values({
        grand_total: toMoney(totals.grandTotal),
        net_total: toMoney(totals.netTotal),
        rfq_id: parsed.rfqId ?? null,
        status: "submitted",
        supplier_id: parsed.supplierId,
        tax_template_id: parsed.taxTemplateId ?? null,
        tax_total: toMoney(totals.taxTotal),
        valid_until: parsed.validUntil ?? null,
      })
      .returning();

    if (!quotation) {
      throw new Error("Failed to create supplier quotation.");
    }

    await ctx.db.insert(accountingSupplierQuotationItem).values(
      parsed.items.map((item) => ({
        amount: toMoney(roundMoney(lineAmount(item))),
        item_id: item.itemId,
        item_tax_template_id: item.itemTaxTemplateId ?? null,
        qty: toMoney(item.qty ?? 1),
        rate: toMoney(item.rate ?? 0),
        rfq_item_id: null,
        supplier_quotation_id: quotation.id,
      })),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: quotation.id,
        entityType: AUDIT_ENTITY_TYPE.SUPPLIER_QUOTATION,
        newState: { supplierId: quotation.supplier_id },
      });
      await ctx.pubsub.publish(SUPPLIER_QUOTATION_EVENTS.RECEIVED, {
        supplierQuotationId: quotation.id,
      });
    });

    return quotation;
  });

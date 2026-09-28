import { accountingQuotation, accountingQuotationItem } from "#/db-schemas/sales";
import { CreateQuotationSchema } from "#/schemas/sales";
import { computeDocumentTotals, lineAmount } from "#/services/totals-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateQuotationSchema });

export const createQuotation = Workflow.name("accounting.quotation.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateQuotationSchema, input);

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

    const [row] = await ctx.db
      .insert(accountingQuotation)
      .values({
        currency: "INR",
        file_id: parsed.fileId ?? null,
        grand_total: toMoney(totals.grandTotal),
        net_total: toMoney(totals.netTotal),
        party_id: parsed.partyId,
        party_type: parsed.partyType ?? "customer",
        posting_date: parsed.postingDate,
        status: "draft",
        tax_template_id: parsed.taxTemplateId ?? null,
        tax_total: toMoney(totals.taxTotal),
        terms_text: parsed.termsText ?? null,
        valid_until: parsed.validUntil ?? null,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create quotation.");
    }

    await ctx.db.insert(accountingQuotationItem).values(
      parsed.items.map((item) => ({
        amount: toMoney(roundMoney(lineAmount(item))),
        discount_amount: toMoney(item.discountAmount ?? 0),
        discount_percent: toMoney(item.discountPercent ?? 0),
        item_id: item.itemId,
        item_name: item.itemName ?? null,
        item_tax_template_id: item.itemTaxTemplateId ?? null,
        qty: toMoney(item.qty ?? 1),
        quotation_id: row.id,
        rate: toMoney(item.rate ?? 0),
        uom: item.uom ?? null,
        uom_factor: toMoney(item.uomFactor ?? 1),
        warehouse_id: item.warehouseId ?? null,
      })),
    );

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.QUOTATION,
        newState: { partyId: row.party_id, status: row.status },
      });
    });

    return row;
  });

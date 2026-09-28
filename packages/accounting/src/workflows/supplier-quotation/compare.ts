import {
  accountingSupplierQuotation,
  accountingSupplierQuotationItem,
} from "#/db-schemas/purchase";
import { parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ rfqId: string() });

export const compareSupplierQuotations = Workflow.name("accounting.supplier-quotation.compare")
  .input(InputSchema)
  .handler(async ({ rfqId }, ctx) =>
    ctx.step.run("query", async () => {
      const quotations = await ctx.db
        .select()
        .from(accountingSupplierQuotation)
        .where(eq(accountingSupplierQuotation.rfq_id, rfqId));
      const rows: { grandTotal: number; quotationId: string; supplierId: string }[] = [];
      for (const quotation of quotations) {
        const items = await ctx.db
          .select()
          .from(accountingSupplierQuotationItem)
          .where(eq(accountingSupplierQuotationItem.supplier_quotation_id, quotation.id));
        void items;
        rows.push({
          grandTotal: parseMoney(quotation.grand_total),
          quotationId: quotation.id,
          supplierId: quotation.supplier_id,
        });
      }
      return rows.sort((first, second) => first.grandTotal - second.grandTotal);
    }),
  );

import {
  accountingSupplierQuotation,
  accountingSupplierQuotationItem,
} from "#/db-schemas/purchase";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getSupplierQuotation = Workflow.name("accounting.supplier-quotation.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [quotation] = await ctx.db
      .select()
      .from(accountingSupplierQuotation)
      .where(eq(accountingSupplierQuotation.id, id))
      .limit(1);
    if (!quotation) {
      throw new Error(`Supplier quotation "${id}" not found.`);
    }
    const items = await ctx.db
      .select()
      .from(accountingSupplierQuotationItem)
      .where(eq(accountingSupplierQuotationItem.supplier_quotation_id, id));
    return { items, quotation };
  });

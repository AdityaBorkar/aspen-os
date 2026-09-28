import { accountingQuotation, accountingQuotationItem } from "#/db-schemas/sales";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getQuotation = Workflow.name("accounting.quotation.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [quotation] = await ctx.db
      .select()
      .from(accountingQuotation)
      .where(eq(accountingQuotation.id, id))
      .limit(1);
    if (!quotation) {
      throw new Error(`Quotation "${id}" not found.`);
    }
    const items = await ctx.db
      .select()
      .from(accountingQuotationItem)
      .where(eq(accountingQuotationItem.quotation_id, id));
    return { items, quotation };
  });

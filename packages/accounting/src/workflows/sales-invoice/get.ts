import { accountingSalesInvoice, accountingSalesInvoiceItem } from "#/db-schemas/sales";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getSalesInvoice = Workflow.name("accounting.sales-invoice.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [invoice] = await ctx.db
      .select()
      .from(accountingSalesInvoice)
      .where(eq(accountingSalesInvoice.id, id))
      .limit(1);
    if (!invoice) {
      throw new Error(`Sales invoice "${id}" not found.`);
    }
    const items = await ctx.db
      .select()
      .from(accountingSalesInvoiceItem)
      .where(eq(accountingSalesInvoiceItem.sales_invoice_id, id));
    return { invoice, items };
  });

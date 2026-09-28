import { accountingPurchaseInvoice, accountingPurchaseInvoiceItem } from "#/db-schemas/purchase";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getPurchaseInvoice = Workflow.name("accounting.purchase-invoice.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [invoice] = await ctx.db
      .select()
      .from(accountingPurchaseInvoice)
      .where(eq(accountingPurchaseInvoice.id, id))
      .limit(1);
    if (!invoice) {
      throw new Error(`Purchase invoice "${id}" not found.`);
    }
    const items = await ctx.db
      .select()
      .from(accountingPurchaseInvoiceItem)
      .where(eq(accountingPurchaseInvoiceItem.purchase_invoice_id, id));
    return { invoice, items };
  });

import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { PurchaseInvoiceFiltersSchema } from "#/schemas/purchase";
import { isOverdue } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listPurchaseInvoices = Workflow.name("accounting.purchase-invoice.list")
  .input(PurchaseInvoiceFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.supplierId) {
        conditions.push(eq(accountingPurchaseInvoice.supplier_id, input.supplierId));
      }
      if (input.status) {
        conditions.push(eq(accountingPurchaseInvoice.status, input.status));
      }
      const rows = await ctx.db
        .select()
        .from(accountingPurchaseInvoice)
        .where(and(...conditions))
        .orderBy(desc(accountingPurchaseInvoice.created_at));
      return rows.filter((row) => {
        if (input.onHoldOnly && !row.on_hold) {
          return false;
        }
        if (input.overdueOnly) {
          return isOverdue(row.due_date) && Number(row.outstanding_amount) > 0;
        }
        return true;
      });
    }),
  );

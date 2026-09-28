import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { OverdueQuerySchema } from "#/schemas/payment";
import { isOverdue } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const getOverduePurchaseInvoices = Workflow.name("accounting.purchase-invoice.overdue")
  .input(OverdueQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.partyId) {
        conditions.push(eq(accountingPurchaseInvoice.supplier_id, input.partyId));
      }
      const rows = await ctx.db
        .select()
        .from(accountingPurchaseInvoice)
        .where(and(...conditions));
      return rows.filter(
        (row) =>
          row.status !== "draft" &&
          row.status !== "cancelled" &&
          row.status !== "paid" &&
          Number(row.outstanding_amount) > 0 &&
          isOverdue(row.due_date),
      );
    }),
  );

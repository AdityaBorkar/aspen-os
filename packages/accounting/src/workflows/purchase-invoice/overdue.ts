import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { OverdueQuerySchema } from "#/schemas/payment";
import { todayDateOnly } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gt, lt, notInArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const getOverduePurchaseInvoices = Workflow.name("accounting.purchase-invoice.overdue")
  .input(OverdueQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const asOf = input.asOf ?? todayDateOnly();
      const conditions: SQL[] = [
        notInArray(accountingPurchaseInvoice.status, ["draft", "cancelled", "paid"]),
        gt(accountingPurchaseInvoice.outstanding_amount, "0"),
        lt(accountingPurchaseInvoice.due_date, asOf),
      ];
      if (input.partyId) {
        conditions.push(eq(accountingPurchaseInvoice.supplier_id, input.partyId));
      }
      return ctx.db
        .select()
        .from(accountingPurchaseInvoice)
        .where(and(...conditions));
    }),
  );

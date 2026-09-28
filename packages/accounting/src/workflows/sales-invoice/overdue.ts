import { accountingSalesInvoice } from "#/db-schemas/sales";
import { OverdueQuerySchema } from "#/schemas/payment";
import { todayDateOnly } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gt, lt, notInArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const getOverdueSalesInvoices = Workflow.name("accounting.sales-invoice.overdue")
  .input(OverdueQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const asOf = input.asOf ?? todayDateOnly();
      const conditions: SQL[] = [
        notInArray(accountingSalesInvoice.status, ["draft", "cancelled", "paid"]),
        gt(accountingSalesInvoice.outstanding_amount, "0"),
        lt(accountingSalesInvoice.due_date, asOf),
      ];
      if (input.partyId) {
        conditions.push(eq(accountingSalesInvoice.customer_id, input.partyId));
      }
      return ctx.db
        .select()
        .from(accountingSalesInvoice)
        .where(and(...conditions));
    }),
  );

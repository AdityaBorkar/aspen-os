import { accountingSalesInvoice } from "#/db-schemas/sales";
import { SALES_INVOICE_EVENTS } from "#/pubsub";
import { OverdueQuerySchema } from "#/schemas/payment";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { todayDateOnly } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gt, inArray, lt, notInArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const markSalesOverdue = Workflow.name("accounting.sales-invoice.mark-overdue")
  .input(OverdueQuerySchema)
  .handler(async (input, ctx) => {
    const asOf = input.asOf ?? todayDateOnly();
    const conditions: SQL[] = [
      notInArray(accountingSalesInvoice.status, ["draft", "cancelled", "paid", "overdue"]),
      gt(accountingSalesInvoice.outstanding_amount, "0"),
      lt(accountingSalesInvoice.due_date, asOf),
    ];
    if (input.partyId) {
      conditions.push(eq(accountingSalesInvoice.customer_id, input.partyId));
    }
    const candidates = await ctx.db
      .select({ id: accountingSalesInvoice.id })
      .from(accountingSalesInvoice)
      .where(and(...conditions));

    if (candidates.length === 0) {
      return [];
    }
    const ids = candidates.map((row) => row.id);
    await ctx.db
      .update(accountingSalesInvoice)
      .set({ status: "overdue", updated_at: new Date() })
      .where(inArray(accountingSalesInvoice.id, ids));

    for (const id of ids) {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.SALES_INVOICE,
        newState: { status: "overdue" },
      });
      await ctx.pubsub.publish(SALES_INVOICE_EVENTS.OVERDUE, { salesInvoiceId: id });
    }
    return ids;
  });

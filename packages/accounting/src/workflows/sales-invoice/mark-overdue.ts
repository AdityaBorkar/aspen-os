import { accountingSalesInvoice } from "#/db-schemas/sales";
import { SALES_INVOICE_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { isOverdue, parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const markSalesOverdue = Workflow.name("accounting.sales-invoice.mark-overdue")
  .input(object({}))
  .handler(async (_input, ctx) => {
    const rows = await ctx.db.select().from(accountingSalesInvoice);
    const marked: string[] = [];
    for (const row of rows) {
      if (row.status !== "unpaid" && row.status !== "partly_paid" && row.status !== "overdue") {
        continue;
      }
      if (parseMoney(row.outstanding_amount) <= 0.005) {
        continue;
      }
      if (!isOverdue(row.due_date)) {
        continue;
      }
      if (row.status !== "overdue") {
        await ctx.db
          .update(accountingSalesInvoice)
          .set({ status: "overdue", updated_at: new Date() })
          .where(eq(accountingSalesInvoice.id, row.id));
        await ctx.audit.write({
          action: AUDIT_ACTION.UPDATED,
          crudAction: "update",
          entityId: row.id,
          entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
          newState: { status: "overdue" },
        });
        await ctx.pubsub.publish(SALES_INVOICE_EVENTS.OVERDUE, { salesInvoiceId: row.id });
      }
      marked.push(row.id);
    }
    return marked;
  });

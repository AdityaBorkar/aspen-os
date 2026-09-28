import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { PURCHASE_INVOICE_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { isOverdue, parseMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const markPurchaseOverdue = Workflow.name("accounting.purchase-invoice.mark-overdue")
  .input(object({}))
  .handler(async (_input, ctx) => {
    const rows = await ctx.db.select().from(accountingPurchaseInvoice);
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
          .update(accountingPurchaseInvoice)
          .set({ status: "overdue", updated_at: new Date() })
          .where(eq(accountingPurchaseInvoice.id, row.id));
        await ctx.audit.write({
          action: AUDIT_ACTION.UPDATED,
          crudAction: "update",
          entityId: row.id,
          entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
          newState: { status: "overdue" },
        });
        await ctx.pubsub.publish(PURCHASE_INVOICE_EVENTS.OVERDUE, { purchaseInvoiceId: row.id });
      }
      marked.push(row.id);
    }
    return marked;
  });

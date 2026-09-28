import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { PURCHASE_INVOICE_EVENTS } from "#/pubsub";
import { OverdueQuerySchema } from "#/schemas/payment";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { todayDateOnly } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gt, inArray, lt, notInArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const markPurchaseOverdue = Workflow.name("accounting.purchase-invoice.mark-overdue")
  .input(OverdueQuerySchema)
  .handler(async (input, ctx) => {
    const asOf = input.asOf ?? todayDateOnly();
    const conditions: SQL[] = [
      notInArray(accountingPurchaseInvoice.status, ["draft", "cancelled", "paid", "overdue"]),
      gt(accountingPurchaseInvoice.outstanding_amount, "0"),
      lt(accountingPurchaseInvoice.due_date, asOf),
    ];
    if (input.partyId) {
      conditions.push(eq(accountingPurchaseInvoice.supplier_id, input.partyId));
    }
    const candidates = await ctx.db
      .select({ id: accountingPurchaseInvoice.id })
      .from(accountingPurchaseInvoice)
      .where(and(...conditions));

    if (candidates.length === 0) {
      return [];
    }
    const ids = candidates.map((row) => row.id);
    await ctx.db
      .update(accountingPurchaseInvoice)
      .set({ status: "overdue", updated_at: new Date() })
      .where(inArray(accountingPurchaseInvoice.id, ids));

    for (const id of ids) {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.PURCHASE_INVOICE,
        newState: { status: "overdue" },
      });
      await ctx.pubsub.publish(PURCHASE_INVOICE_EVENTS.OVERDUE, { purchaseInvoiceId: id });
    }
    return ids;
  });

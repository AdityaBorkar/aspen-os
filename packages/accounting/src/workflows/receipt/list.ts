import { accountingReceiptNote } from "#/db-schemas/purchase";
import { ReceiptFiltersSchema } from "#/schemas/purchase";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listReceiptNotes = Workflow.name("accounting.receipt.list")
  .input(ReceiptFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.supplierId) {
        conditions.push(eq(accountingReceiptNote.supplier_id, input.supplierId));
      }
      if (input.purchaseOrderId) {
        conditions.push(eq(accountingReceiptNote.purchase_order_id, input.purchaseOrderId));
      }
      return ctx.db
        .select()
        .from(accountingReceiptNote)
        .where(and(...conditions))
        .orderBy(desc(accountingReceiptNote.created_at));
    }),
  );

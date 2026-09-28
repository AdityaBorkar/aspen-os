import { accountingPurchaseOrder } from "#/db-schemas/purchase";
import { PurchaseOrderFiltersSchema } from "#/schemas/purchase";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listPurchaseOrders = Workflow.name("accounting.purchase-order.list")
  .input(PurchaseOrderFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.supplierId) {
        conditions.push(eq(accountingPurchaseOrder.supplier_id, input.supplierId));
      }
      if (input.status) {
        conditions.push(eq(accountingPurchaseOrder.status, input.status));
      }
      return ctx.db
        .select()
        .from(accountingPurchaseOrder)
        .where(and(...conditions))
        .orderBy(desc(accountingPurchaseOrder.created_at));
    }),
  );

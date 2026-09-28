import { accountingDeliveryNote } from "#/db-schemas/sales";
import { DeliveryFiltersSchema } from "#/schemas/sales";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listDeliveryNotes = Workflow.name("accounting.delivery.list")
  .input(DeliveryFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.customerId) {
        conditions.push(eq(accountingDeliveryNote.customer_id, input.customerId));
      }
      if (input.salesOrderId) {
        conditions.push(eq(accountingDeliveryNote.sales_order_id, input.salesOrderId));
      }
      return ctx.db
        .select()
        .from(accountingDeliveryNote)
        .where(and(...conditions))
        .orderBy(desc(accountingDeliveryNote.created_at));
    }),
  );

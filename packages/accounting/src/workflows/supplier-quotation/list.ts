import { accountingSupplierQuotation } from "#/db-schemas/purchase";
import { SupplierQuotationFiltersSchema } from "#/schemas/purchase";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listSupplierQuotations = Workflow.name("accounting.supplier-quotation.list")
  .input(SupplierQuotationFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.supplierId) {
        conditions.push(eq(accountingSupplierQuotation.supplier_id, input.supplierId));
      }
      if (input.rfqId) {
        conditions.push(eq(accountingSupplierQuotation.rfq_id, input.rfqId));
      }
      return ctx.db
        .select()
        .from(accountingSupplierQuotation)
        .where(and(...conditions));
    }),
  );

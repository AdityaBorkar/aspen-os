import { accountingQuotation } from "#/db-schemas/sales";
import { QuotationFiltersSchema } from "#/schemas/sales";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listQuotations = Workflow.name("accounting.quotation.list")
  .input(QuotationFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.partyId) {
        conditions.push(eq(accountingQuotation.party_id, input.partyId));
      }
      if (input.status) {
        conditions.push(eq(accountingQuotation.status, input.status));
      }
      return ctx.db
        .select()
        .from(accountingQuotation)
        .where(and(...conditions))
        .orderBy(desc(accountingQuotation.created_at));
    }),
  );

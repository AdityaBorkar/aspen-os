import { accountingGlEntry } from "#/db-schemas/chart";
import { StatementFiltersSchema } from "#/schemas/reports";
import { buildGlConditions } from "#/services/gl-queries";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc } from "drizzle-orm";

export const generalLedger = Workflow.name("accounting.report.general-ledger")
  .input(StatementFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions = buildGlConditions(input);
      if (conditions.length === 0) {
        return ctx.db.select().from(accountingGlEntry).orderBy(asc(accountingGlEntry.posting_date));
      }
      return ctx.db
        .select()
        .from(accountingGlEntry)
        .where(and(...conditions))
        .orderBy(asc(accountingGlEntry.posting_date));
    }),
  );

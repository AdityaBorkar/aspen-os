import { accountingGlEntry } from "#/db-schemas/chart";
import { StatementFiltersSchema } from "#/schemas/reports";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const generalLedger = Workflow.name("accounting.report.general-ledger")
  .input(StatementFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.fiscalYear) {
        conditions.push(eq(accountingGlEntry.fiscal_year, input.fiscalYear));
      }
      if (input.fromDate) {
        conditions.push(gte(accountingGlEntry.posting_date, input.fromDate));
      }
      if (input.toDate) {
        conditions.push(lte(accountingGlEntry.posting_date, input.toDate));
      }
      if (input.accountId) {
        conditions.push(eq(accountingGlEntry.account_id, input.accountId));
      }
      if (input.partyId) {
        conditions.push(eq(accountingGlEntry.party_id, input.partyId));
      }
      return ctx.db
        .select()
        .from(accountingGlEntry)
        .where(and(...conditions))
        .orderBy(asc(accountingGlEntry.posting_date));
    }),
  );

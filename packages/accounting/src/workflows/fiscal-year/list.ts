import { accountingFiscalYear } from "#/db-schemas/chart";
import { FiscalYearFiltersSchema } from "#/schemas/chart";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listFiscalYears = Workflow.name("accounting.fiscal-year.list")
  .input(FiscalYearFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.status) {
        conditions.push(eq(accountingFiscalYear.status, input.status));
      }
      return ctx.db
        .select()
        .from(accountingFiscalYear)
        .where(and(...conditions))
        .orderBy(asc(accountingFiscalYear.start_date));
    }),
  );

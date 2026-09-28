import { accountingFiscalYear } from "#/db-schemas/chart";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getFiscalYear = Workflow.name("accounting.fiscal-year.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(accountingFiscalYear)
      .where(eq(accountingFiscalYear.id, id))
      .limit(1);
    if (!row) {
      throw new Error(`Fiscal year "${id}" not found.`);
    }
    return row;
  });

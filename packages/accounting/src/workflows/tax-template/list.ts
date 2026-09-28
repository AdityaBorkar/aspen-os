import { accountingTaxRule, accountingTaxTemplate } from "#/db-schemas/tax";
import { TaxTemplateFiltersSchema } from "#/schemas/tax";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listTaxTemplates = Workflow.name("accounting.tax-template.list")
  .input(TaxTemplateFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.isSales !== undefined) {
        conditions.push(eq(accountingTaxTemplate.is_sales, input.isSales));
      }
      return ctx.db
        .select()
        .from(accountingTaxTemplate)
        .where(and(...conditions))
        .orderBy(asc(accountingTaxTemplate.name));
    }),
  );

export const getTaxTemplateRules = Workflow.name("accounting.tax-template.get-rules")
  .input(TaxTemplateFiltersSchema)
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => ctx.db.select().from(accountingTaxRule).limit(100)),
  );

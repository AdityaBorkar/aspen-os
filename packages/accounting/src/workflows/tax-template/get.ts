import { accountingTaxRule, accountingTaxTemplate } from "#/db-schemas/tax";

import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getTaxTemplate = Workflow.name("accounting.tax-template.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [template] = await ctx.db
      .select()
      .from(accountingTaxTemplate)
      .where(eq(accountingTaxTemplate.id, id))
      .limit(1);
    if (!template) {
      throw new Error(`Tax template "${id}" not found.`);
    }
    const rules = await ctx.db
      .select()
      .from(accountingTaxRule)
      .where(eq(accountingTaxRule.template_id, id))
      .orderBy(asc(accountingTaxRule.row_index));
    return { rules, template };
  });

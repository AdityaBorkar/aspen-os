import { accountingTermsTemplate } from "#/db-schemas/settings";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getTermsTemplate = Workflow.name("accounting.terms.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(accountingTermsTemplate)
      .where(eq(accountingTermsTemplate.id, id))
      .limit(1);
    if (!row) {
      throw new Error(`Terms template "${id}" not found.`);
    }
    return row;
  });

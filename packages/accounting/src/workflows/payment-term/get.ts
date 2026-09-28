import { accountingPaymentTermTemplate } from "#/db-schemas/tax";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getPaymentTermTemplate = Workflow.name("accounting.payment-term.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(accountingPaymentTermTemplate)
      .where(eq(accountingPaymentTermTemplate.id, id))
      .limit(1);
    if (!row) {
      throw new Error(`Payment term template "${id}" not found.`);
    }
    return row;
  });

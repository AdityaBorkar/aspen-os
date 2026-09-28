import { accountingPaymentEntry, accountingPaymentReference } from "#/db-schemas/payment";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getPaymentEntry = Workflow.name("accounting.payment.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [entry] = await ctx.db
      .select()
      .from(accountingPaymentEntry)
      .where(eq(accountingPaymentEntry.id, id))
      .limit(1);
    if (!entry) {
      throw new Error(`Payment entry "${id}" not found.`);
    }
    const references = await ctx.db
      .select()
      .from(accountingPaymentReference)
      .where(eq(accountingPaymentReference.payment_id, id));
    return { entry, references };
  });

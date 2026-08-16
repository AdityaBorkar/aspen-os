import { masterPaymentMethod } from "#/db-schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const fetchPaymentMethodStep = WorkflowStep.name("masters-fetch-payment-method")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(masterPaymentMethod)
      .where(eq(masterPaymentMethod.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Payment method with id "${input.id}" not found.`);
    }

    return result;
  });

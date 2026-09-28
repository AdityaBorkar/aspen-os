import { accountingPaymentTermTemplate } from "#/db-schemas/tax";
import { PaymentTermFiltersSchema } from "#/schemas/tax";

import { Workflow } from "@aspen-os/platform/server";
import { asc } from "drizzle-orm";

export const listPaymentTermTemplates = Workflow.name("accounting.payment-term.list")
  .input(PaymentTermFiltersSchema)
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(accountingPaymentTermTemplate)
        .orderBy(asc(accountingPaymentTermTemplate.name)),
    ),
  );

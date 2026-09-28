import { accountingPaymentEntry } from "#/db-schemas/payment";
import { PaymentFiltersSchema } from "#/schemas/payment";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listPaymentEntries = Workflow.name("accounting.payment.list")
  .input(PaymentFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.partyId) {
        conditions.push(eq(accountingPaymentEntry.party_id, input.partyId));
      }
      if (input.paymentType) {
        conditions.push(eq(accountingPaymentEntry.payment_type, input.paymentType));
      }
      return ctx.db
        .select()
        .from(accountingPaymentEntry)
        .where(and(...conditions))
        .orderBy(desc(accountingPaymentEntry.created_at));
    }),
  );

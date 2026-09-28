import { accountingPaymentEntry } from "#/db-schemas/payment";
import { UnallocatedQuerySchema } from "#/schemas/payment";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gt } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listUnallocatedPayments = Workflow.name("accounting.reconciliation.unallocated")
  .input(UnallocatedQuerySchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [
        gt(accountingPaymentEntry.unallocated_amount, "0"),
        eq(accountingPaymentEntry.status, "submitted"),
      ];
      if (input.partyId) {
        conditions.push(eq(accountingPaymentEntry.party_id, input.partyId));
      }
      if (input.partyType) {
        conditions.push(eq(accountingPaymentEntry.party_type, input.partyType));
      }
      return ctx.db
        .select()
        .from(accountingPaymentEntry)
        .where(and(...conditions));
    }),
  );

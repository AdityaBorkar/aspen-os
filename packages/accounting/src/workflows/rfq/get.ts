import { accountingRfq, accountingRfqItem } from "#/db-schemas/purchase";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getRfq = Workflow.name("accounting.rfq.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [rfq] = await ctx.db
      .select()
      .from(accountingRfq)
      .where(eq(accountingRfq.id, id))
      .limit(1);
    if (!rfq) {
      throw new Error(`RFQ "${id}" not found.`);
    }
    const items = await ctx.db
      .select()
      .from(accountingRfqItem)
      .where(eq(accountingRfqItem.rfq_id, id));
    return { items, rfq };
  });

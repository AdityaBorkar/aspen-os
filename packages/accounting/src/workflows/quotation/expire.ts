import { accountingQuotation } from "#/db-schemas/sales";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const expireQuotation = Workflow.name("accounting.quotation.expire")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [existing] = await ctx.db
      .select()
      .from(accountingQuotation)
      .where(eq(accountingQuotation.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Quotation "${id}" not found.`);
    }
    if (existing.status !== "submitted") {
      throw new Error("Only submitted quotations can expire.");
    }

    const [updated] = await ctx.db
      .update(accountingQuotation)
      .set({ status: "expired", updated_at: new Date() })
      .where(eq(accountingQuotation.id, id))
      .returning();

    return assertUpdated(updated, `Quotation "${id}"`);
  });

import { fullAndFinalStatement } from "#/db-schemas";
import { assertUpdated, fetchFullAndFinalById, requireStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  paymentEntry: pipe(string(), minLength(1, "paymentEntry is required")),
});

export const markFullAndFinalPaid = Workflow.name("hr.lifecycle.mark-full-and-final-paid")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, paymentEntry } = input;

    const statement = await fetchFullAndFinalById(ctx.db, id);
    requireStatus(statement, "approved", `Full and final statement "${id}"`);

    const [updated] = await ctx.db
      .update(fullAndFinalStatement)
      .set({
        paid_at: new Date(),
        payment_entry: paymentEntry,
        status: "paid",
        updated_at: new Date(),
      })
      .where(eq(fullAndFinalStatement.id, id))
      .returning();

    return assertUpdated(updated, `Full and final statement "${id}"`);
  });

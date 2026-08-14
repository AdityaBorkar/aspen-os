import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { fullAndFinalStatement } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  paymentEntry: pipe(string(), minLength(1, "paymentEntry is required")),
});

export const markFullAndFinalPaid = Workflow.name("hr.lifecycle.mark-full-and-final-paid")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, paymentEntry } = input;

    const [updated] = await ctx.db
      .update(fullAndFinalStatement)
      .set({
        paidAt: new Date(),
        paymentEntry,
        status: "paid",
        updatedAt: new Date(),
      })
      .where(eq(fullAndFinalStatement.id, id))
      .returning();

    return updated;
  });

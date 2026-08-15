import { fullAndFinalStatement } from "#/db-schemas";
import { UpdateFullAndFinalSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateFullAndFinalSchema,
});

export const updateFullAndFinal = Workflow.name("hr.lifecycle.update-full-and-final")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateFullAndFinalSchema, patch);

    // Calculate totals if provided
    const { paidAt, ...rest } = parsed;

    const updateData: Partial<typeof fullAndFinalStatement.$inferInsert> = {
      ...rest,
      updatedAt: new Date(),
    };

    if (paidAt) {
      updateData.paidAt = new Date(paidAt);
    }

    const [updated] = await ctx.db
      .update(fullAndFinalStatement)
      .set(updateData)
      .where(eq(fullAndFinalStatement.id, id))
      .returning();

    return updated;
  });

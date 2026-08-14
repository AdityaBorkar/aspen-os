import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeePromotion } from "../../../db-schemas";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approvePromotion = Workflow.name("hr.lifecycle.approve-promotion")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const [updated] = await ctx.db
      .update(employeePromotion)
      .set({
        approvedAt: new Date(),
        approvedBy,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(employeePromotion.id, id))
      .returning();

    return updated;
  });

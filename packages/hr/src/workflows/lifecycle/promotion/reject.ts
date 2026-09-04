import { employeePromotion } from "#/db-schemas";
import { assertUpdated, fetchPromotionById, requireStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  rejectedBy: pipe(string(), minLength(1, "rejectedBy is required")),
  rejectionReason: pipe(string(), minLength(1, "rejectionReason is required")),
});

export const rejectPromotion = Workflow.name("hr.lifecycle.reject-promotion")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, rejectedBy, rejectionReason } = input;

    const promotion = await fetchPromotionById(ctx.db, id);
    requireStatus(promotion, "pending", `Promotion "${id}"`);

    const [updated] = await ctx.db
      .update(employeePromotion)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(employeePromotion.id, id))
      .returning();

    return assertUpdated(updated, `Promotion "${id}"`);
  });

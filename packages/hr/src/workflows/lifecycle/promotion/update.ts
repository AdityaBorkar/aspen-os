import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { employeePromotion } from "../../../db-schemas";
import { UpdatePromotionSchema } from "../../../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdatePromotionSchema,
});

export const updatePromotion = Workflow.name("hr.lifecycle.update-promotion")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdatePromotionSchema, patch);

    const [updated] = await ctx.db
      .update(employeePromotion)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeePromotion.id, id))
      .returning();

    return updated;
  });

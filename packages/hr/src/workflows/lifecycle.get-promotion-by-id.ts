import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeePromotion } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getPromotionById = Workflow.name("hr.lifecycle.get-promotion-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(employeePromotion)
      .where(eq(employeePromotion.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Promotion with id "${id}" not found.`);
    }

    return result;
  });

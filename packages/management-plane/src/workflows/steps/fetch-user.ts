import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { user } from "../../db-schemas";
import { IdSchema } from "../../types";

export const fetchUserStep = WorkflowStep.name("fetch-user")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select({
        createdAt: user.createdAt,
        email: user.email,
        id: user.id,
        name: user.name,
        role: user.role,
        spId: user.spId,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Platform user with id "${input.id}" not found.`);
    }

    return result;
  });

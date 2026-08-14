import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { branch } from "../../db-schemas";

export const archiveBranch = Workflow.name("branch.archive")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [updated] = await ctx.db
      .update(branch)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(branch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    return updated;
  });

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { branch } from "../../db-schemas";
import { BRANCH_EVENTS } from "../../pubsub";

export const deactivateBranch = Workflow.name("branch.deactivate")
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

    await ctx.pubsub.publish(BRANCH_EVENTS.DEACTIVATED, {
      branchId: input.id,
    });

    return updated;
  });

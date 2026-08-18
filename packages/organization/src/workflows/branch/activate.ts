import { branch } from "#/db-schemas";
import { BRANCH_EVENTS } from "#/pubsub";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import * as vb from "valibot";

export const activateBranch = Workflow.name("branch.activate")
  .input(vb.object({ id: vb.string() }))
  .handler(async (input, ctx) => {
    const [updated] = await ctx.db
      .update(branch)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(branch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(BRANCH_EVENTS.ACTIVATED, {
      branchId: input.id,
    });

    return updated;
  });

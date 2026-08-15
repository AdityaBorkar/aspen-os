import { branch } from "#/db-schemas";
import { BRANCH_EVENTS } from "#/pubsub";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { date, object, string } from "valibot";

export const closeBranch = Workflow.name("branch.close")
  .input(object({ date: date(), id: string() }))
  .handler(async (input, ctx) => {
    const [updated] = await ctx.db
      .update(branch)
      .set({
        closedDate: input.date.toISOString().split("T")[0],
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(branch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(BRANCH_EVENTS.CLOSED, {
      branchId: input.id,
      date: input.date.toISOString().split("T")[0],
    });

    return updated;
  });

import { branch } from "#/db-schemas";
import { BRANCH_EVENTS } from "#/pubsub";
import { toDateOnly } from "#/utils/dates";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { date, object, string } from "valibot";

export const closeBranch = Workflow.name("branch.close")
  .input(object({ date: date(), id: string() }))
  .handler(async (input, ctx) => {
    const closedDate = toDateOnly(input.date);
    const [updated] = await ctx.db
      .update(branch)
      .set({ closed_date: closedDate, is_active: false, updated_at: new Date() })
      .where(eq(branch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(BRANCH_EVENTS.CLOSED, {
      branchId: input.id,
      date: closedDate,
    });

    return updated;
  });

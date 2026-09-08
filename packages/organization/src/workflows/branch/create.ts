import { branch } from "#/db-schemas";
import { BRANCH_EVENTS } from "#/pubsub";
import { CreateBranchSchema } from "#/types";
import { toDateOnly } from "#/utils/dates";
import {
  ensureCodeUnique,
  ensureNoHeadquartersExists,
  validateParentBranch,
} from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";

export const createBranch = Workflow.name("branch.create")
  .input(CreateBranchSchema)
  .handler(async (input, ctx) => {
    await ensureCodeUnique(ctx.db, input.code);

    if (input.type === "headquarters") {
      await ensureNoHeadquartersExists(ctx.db);
    }

    if (input.parentBranch) {
      await validateParentBranch(ctx.db, input.parentBranch);
    }

    const [result] = await ctx.db
      .insert(branch)
      .values({
        capacity: input.capacity ?? null,
        closed_date: input.closedDate ? toDateOnly(input.closedDate) : null,
        code: input.code.toUpperCase(),
        metadata: input.metadata ?? null,
        name: input.name,
        opened_date: input.openedDate ? toDateOnly(input.openedDate) : null,
        parent_branch: input.parentBranch ?? null,
        timezone: input.timezone ?? null,
        type: input.type,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create branch.");
    }

    await ctx.pubsub.publish(BRANCH_EVENTS.CREATED, {
      branch: {
        code: result.code,
        id: result.id,
        name: result.name,
        type: result.type,
      },
    });

    return result;
  });

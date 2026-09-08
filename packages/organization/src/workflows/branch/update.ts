import { branch } from "#/db-schemas";
import { BRANCH_EVENTS } from "#/pubsub";
import { UpdateBranchSchema } from "#/types";
import { toDateOnly } from "#/utils/dates";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchBranchStep } from "#/workflow-steps/fetch-branch";
import {
  ensureCodeUnique,
  ensureNoHeadquartersExists,
  validateParentBranch,
} from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateBranchSchema,
});

export const updateBranch = Workflow.name("branch.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchBranchStep, { id: input.id });

    if (input.patch.code !== undefined) {
      await ensureCodeUnique(ctx.db, input.patch.code, input.id);
    }

    if (input.patch.type === "headquarters" && current.type !== "headquarters") {
      await ensureNoHeadquartersExists(ctx.db, input.id);
    }

    if (input.patch.parentBranch !== undefined && input.patch.parentBranch !== null) {
      await validateParentBranch(ctx.db, input.patch.parentBranch, input.id);
    }

    const values = stripUndefined({
      capacity: input.patch.capacity,
      closed_date:
        input.patch.closedDate === undefined ? undefined : toDateOnly(input.patch.closedDate),
      code: input.patch.code?.toUpperCase(),
      metadata: input.patch.metadata,
      name: input.patch.name,
      opened_date:
        input.patch.openedDate === undefined ? undefined : toDateOnly(input.patch.openedDate),
      parent_branch: input.patch.parentBranch,
      timezone: input.patch.timezone,
      type: input.patch.type,
    });

    const [updated] = await ctx.db
      .update(branch)
      .set({ ...values, updated_at: new Date() })
      .where(eq(branch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(BRANCH_EVENTS.UPDATED, {
      branch: { id: updated.id, name: updated.name },
      changes: values,
    });

    return updated;
  });

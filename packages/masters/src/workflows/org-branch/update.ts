import { orgBranch } from "#/db-schemas";
import { ORG_BRANCH_EVENTS } from "#/pubsub";
import { UpdateOrgBranchSchema } from "#/types";
import { toDateOnly } from "#/utils/dates";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchOrgBranchStep } from "#/workflow-steps/fetch-org-branch";
import {
  ensureNoHeadquartersExists,
  ensureOrgBranchCodeUnique,
  validateParentOrgBranch,
} from "#/workflows/org-branch/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateOrgBranchSchema,
});

export const updateOrgBranch = Workflow.name("masters.org_branch.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchOrgBranchStep, { id: input.id });

    if (input.patch.code !== undefined) {
      await ensureOrgBranchCodeUnique(ctx.db, input.patch.code, input.id);
    }

    if (input.patch.type === "headquarters" && current.type !== "headquarters") {
      await ensureNoHeadquartersExists(ctx.db, input.id);
    }

    if (input.patch.parentOrgBranch !== undefined && input.patch.parentOrgBranch !== null) {
      await validateParentOrgBranch(ctx.db, input.patch.parentOrgBranch, input.id);
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
      parent_org_branch: input.patch.parentOrgBranch,
      timezone: input.patch.timezone,
      type: input.patch.type,
    });

    const [updated] = await ctx.db
      .update(orgBranch)
      .set({ ...values, updated_at: new Date() })
      .where(eq(orgBranch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Org branch with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(ORG_BRANCH_EVENTS.UPDATED, {
      changes: values,
      orgBranch: { id: updated.id, name: updated.name },
    });

    return updated;
  });

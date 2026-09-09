import { orgBranch } from "#/db-schemas";
import { ORG_BRANCH_EVENTS } from "#/pubsub";
import { CreateOrgBranchSchema } from "#/types";
import { toDateOnly } from "#/utils/dates";
import {
  ensureNoHeadquartersExists,
  ensureOrgBranchCodeUnique,
  validateParentOrgBranch,
} from "#/workflows/org-branch/utils";

import { Workflow } from "@aspen-os/platform/server";

export const createOrgBranch = Workflow.name("masters.org_branch.create")
  .input(CreateOrgBranchSchema)
  .handler(async (input, ctx) => {
    await ensureOrgBranchCodeUnique(ctx.db, input.code);

    if (input.type === "headquarters") {
      await ensureNoHeadquartersExists(ctx.db);
    }

    if (input.parentOrgBranch) {
      await validateParentOrgBranch(ctx.db, input.parentOrgBranch);
    }

    const [result] = await ctx.db
      .insert(orgBranch)
      .values({
        capacity: input.capacity ?? null,
        closed_date: input.closedDate ? toDateOnly(input.closedDate) : null,
        code: input.code.toUpperCase(),
        metadata: input.metadata ?? null,
        name: input.name,
        opened_date: input.openedDate ? toDateOnly(input.openedDate) : null,
        parent_org_branch: input.parentOrgBranch ?? null,
        timezone: input.timezone ?? null,
        type: input.type,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create org branch.");
    }

    await ctx.pubsub.publish(ORG_BRANCH_EVENTS.CREATED, {
      orgBranch: {
        code: result.code,
        id: result.id,
        name: result.name,
        type: result.type,
      },
    });

    return result;
  });

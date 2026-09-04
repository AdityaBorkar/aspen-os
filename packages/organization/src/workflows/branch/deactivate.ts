import { BRANCH_EVENTS } from "#/pubsub";
import { setBranchActive } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

export const deactivateBranch = Workflow.name("branch.deactivate")
  .input(object({ id: string() }))
  .handler(async (input, ctx) =>
    setBranchActive(ctx.db, ctx.pubsub, {
      id: input.id,
      isActive: false,
      topic: BRANCH_EVENTS.DEACTIVATED,
    }),
  );

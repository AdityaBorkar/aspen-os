import { BRANCH_EVENTS } from "#/pubsub";
import { setBranchActive } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

export const restoreBranch = Workflow.name("branch.restore")
  .input(object({ id: string() }))
  .handler(async (input, ctx) =>
    setBranchActive(ctx.db, ctx.pubsub, {
      id: input.id,
      isActive: true,
      topic: BRANCH_EVENTS.RESTORED,
    }),
  );

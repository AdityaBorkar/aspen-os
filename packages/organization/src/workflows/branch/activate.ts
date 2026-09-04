import { BRANCH_EVENTS } from "#/pubsub";
import { setBranchActive } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import * as vb from "valibot";

export const activateBranch = Workflow.name("branch.activate")
  .input(vb.object({ id: vb.string() }))
  .handler(async (input, ctx) =>
    setBranchActive(ctx.db, ctx.pubsub, {
      id: input.id,
      isActive: true,
      topic: BRANCH_EVENTS.ACTIVATED,
    }),
  );

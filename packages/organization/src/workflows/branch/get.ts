import { fetchBranchStep } from "#/workflow-steps/fetch-branch";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

export const getBranch = Workflow.name("branch.get")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => ctx.step.run(fetchBranchStep, { id: input.id }));

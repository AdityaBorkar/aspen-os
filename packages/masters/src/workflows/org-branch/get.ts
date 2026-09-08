import { fetchOrgBranchStep } from "#/workflow-steps/fetch-org-branch";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

export const getOrgBranch = Workflow.name("masters.org_branch.get")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => ctx.step.run(fetchOrgBranchStep, { id: input.id }));

// Deprecated alias — prefer getOrgBranch.
export const getBranch = getOrgBranch;

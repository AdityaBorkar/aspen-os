import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

import { fetchBranchStep } from "./steps/fetch-branch";

export const getBranch = Workflow.name("branch.get")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => ctx.step.run(fetchBranchStep, { id: input.id }));

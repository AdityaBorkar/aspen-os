import { assertCanAccess } from "#/services/access-service";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

const GetInputSchema = object({ id: string() });

export const getDraft = Workflow.name("workspace.draft.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => {
    const draft = await ctx.step.run(fetchDraftStep, { id });
    assertCanAccess(draft, ctx.actorId);
    return draft;
  });

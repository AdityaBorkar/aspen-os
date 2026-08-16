import { assertCanAccess } from "#/services/access-service";
import { fetchViewStep } from "#/workflow-steps/fetch-view";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

const GetInputSchema = object({ id: string() });

export const getView = Workflow.name("workspace.view.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => {
    const view = await ctx.step.run(fetchViewStep, { id });
    assertCanAccess(view, ctx.actorId);
    return view;
  });

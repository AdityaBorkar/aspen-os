import { fetchFilterViewStep } from "#/workflow-steps/fetch-filter-view";
import { assertCanAccess } from "#/workflow-steps/filter-view-access";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

const GetInputSchema = object({ id: string() });

export const getFilterView = Workflow.name("workspace.filter-view.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => {
    const view = await ctx.step.run(fetchFilterViewStep, { id });
    assertCanAccess(view, ctx.actorId);
    return view;
  });

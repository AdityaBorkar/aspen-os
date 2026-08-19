import { getViewResolver } from "#/runtime";
import { ApplyViewSchema } from "#/types";
import { assertCanAccess } from "#/workflow-steps/access-service";
import { fetchViewStep } from "#/workflow-steps/fetch-view";

import { Workflow } from "@aspen-os/platform/server";

export const applyView = Workflow.name("workspace.view.apply")
  .input(ApplyViewSchema)
  .handler(async ({ id, limit, offset }, ctx) => {
    const view = await ctx.step.run(fetchViewStep, { id });
    assertCanAccess(view, ctx.actorId);

    const resolver = getViewResolver(view.domain);

    return ctx.step.run("resolve", async () =>
      resolver(view.conditions, view.sort, { limit, offset }),
    );
  });

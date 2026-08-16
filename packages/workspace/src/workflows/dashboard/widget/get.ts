import { assertCanAccess } from "#/services/access-service";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";
import { fetchWidgetStep } from "#/workflow-steps/fetch-widget";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

const GetInputSchema = object({ id: string() });

export const getWidget = Workflow.name("workspace.widget.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => {
    const widget = await ctx.step.run(fetchWidgetStep, { id });
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: widget.dashboardId });
    assertCanAccess(dashboard, ctx.actorId);
    return widget;
  });

import { assertCanAccess } from "#/services/access-service";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

const GetInputSchema = object({ id: string() });

export const getDashboard = Workflow.name("workspace.dashboard.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => {
    const dashboard = await ctx.step.run(fetchDashboardStep, { id });
    assertCanAccess(dashboard, ctx.actorId);
    return dashboard;
  });

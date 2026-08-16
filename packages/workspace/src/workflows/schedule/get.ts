import { assertCanAccess } from "#/services/access-service";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";
import { fetchScheduleStep } from "#/workflow-steps/fetch-schedule";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

const GetInputSchema = object({ id: string() });

export const getSchedule = Workflow.name("workspace.schedule.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => {
    const schedule = await ctx.step.run(fetchScheduleStep, { id });
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: schedule.dashboardId });
    assertCanAccess(dashboard, ctx.actorId);
    return schedule;
  });

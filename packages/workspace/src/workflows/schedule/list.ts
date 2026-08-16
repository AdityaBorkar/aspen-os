import { workspaceDashboard, workspaceSchedule } from "#/db-schemas";
import { assertCanAccess } from "#/services/access-service";
import { ScheduleFiltersSchema } from "#/types";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ filters: ScheduleFiltersSchema });

export const listSchedules = Workflow.name("workspace.schedule.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const validated = parse(ScheduleFiltersSchema, filters);

    const accessibleDashboardIds = ctx.db
      .select({ id: workspaceDashboard.id })
      .from(workspaceDashboard)
      .where(
        or(eq(workspaceDashboard.access, "global"), eq(workspaceDashboard.ownerId, ctx.actorId)),
      );

    const conditions = [inArray(workspaceSchedule.dashboardId, accessibleDashboardIds)];
    if (validated.dashboardId) {
      const dashboard = await ctx.step.run(fetchDashboardStep, { id: validated.dashboardId });
      assertCanAccess(dashboard, ctx.actorId);
      conditions.push(eq(workspaceSchedule.dashboardId, validated.dashboardId));
    }

    return ctx.db
      .select()
      .from(workspaceSchedule)
      .where(and(...conditions))
      .orderBy(asc(workspaceSchedule.createdAt))
      .limit(validated.limit ?? 50)
      .offset(validated.offset ?? 0);
  });

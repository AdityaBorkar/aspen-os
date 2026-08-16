import { workspaceWidget } from "#/db-schemas";
import { assertCanAccess } from "#/services/access-service";
import { WidgetFiltersSchema } from "#/types";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";

import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ filters: WidgetFiltersSchema });

export const listWidgets = Workflow.name("workspace.widget.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    const validated = parse(WidgetFiltersSchema, filters);
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: validated.dashboardId });
    assertCanAccess(dashboard, ctx.actorId);

    return ctx.db
      .select()
      .from(workspaceWidget)
      .where(eq(workspaceWidget.dashboardId, validated.dashboardId))
      .orderBy(asc(workspaceWidget.createdAt))
      .limit(validated.limit ?? 50)
      .offset(validated.offset ?? 0);
  });

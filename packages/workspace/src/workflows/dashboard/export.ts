import { workspaceWidget } from "#/db-schemas";
import { assertCanAccess } from "#/services/access-service";
import { ExportDashboardSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const exportDashboard = Workflow.name("workspace.dashboard.export")
  .input(ExportDashboardSchema)
  .handler(async ({ id }, ctx) => {
    const dashboard = await ctx.step.run(fetchDashboardStep, { id });
    assertCanAccess(dashboard, ctx.actorId);

    const widgets = await ctx.db
      .select()
      .from(workspaceWidget)
      .where(eq(workspaceWidget.dashboardId, id));

    await ctx.audit.write({
      action: AUDIT_ACTION.EXPORTED,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.DASHBOARD,
      metadata: { widgetCount: widgets.length },
    });

    return {
      dashboard: {
        description: dashboard.description,
        metadata: dashboard.metadata,
        name: dashboard.name,
      },
      layout: dashboard.layout,
      widgets: widgets.map((widget) => ({
        config: widget.config,
        domain: widget.domain,
        filter: widget.filter,
        id: widget.id,
        title: widget.title,
        type: widget.type,
        viewId: widget.viewId,
      })),
    };
  });

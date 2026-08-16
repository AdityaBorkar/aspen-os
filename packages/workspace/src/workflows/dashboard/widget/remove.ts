import { workspaceDashboard, workspaceWidget } from "#/db-schemas";
import { WIDGET_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";
import { fetchWidgetStep } from "#/workflow-steps/fetch-widget";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const RemoveInputSchema = object({ id: string() });

export const removeWidget = Workflow.name("workspace.widget.remove")
  .input(RemoveInputSchema)
  .handler(async ({ id }, ctx) => {
    const widget = await ctx.step.run(fetchWidgetStep, { id });
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: widget.dashboardId });
    await assertCanMutate(dashboard, ctx.actorId);

    await ctx.db.delete(workspaceWidget).where(eq(workspaceWidget.id, id));

    const layout = dashboard.layout.filter((placement) => placement.widgetId !== id);
    await ctx.db
      .update(workspaceDashboard)
      .set({ layout, updatedAt: new Date() })
      .where(eq(workspaceDashboard.id, dashboard.id));

    await ctx.audit.write({
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.WIDGET,
      metadata: { dashboardId: dashboard.id },
    });

    await ctx.pubsub.publish(WIDGET_EVENTS.REMOVED, {
      dashboardId: dashboard.id,
      widgetId: id,
    });

    return { id };
  });

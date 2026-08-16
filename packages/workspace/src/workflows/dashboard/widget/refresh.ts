import { workspaceWidget } from "#/db-schemas";
import { WIDGET_EVENTS } from "#/pubsub";
import { assertCanAccess } from "#/services/access-service";
import { RefreshWidgetSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";
import { fetchWidgetStep } from "#/workflow-steps/fetch-widget";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const refreshWidget = Workflow.name("workspace.widget.refresh")
  .input(RefreshWidgetSchema)
  .handler(async ({ id, error }, ctx) => {
    const widget = await ctx.step.run(fetchWidgetStep, { id });
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: widget.dashboardId });
    assertCanAccess(dashboard, ctx.actorId);

    const [updated] = await ctx.db
      .update(workspaceWidget)
      .set({ lastError: error ?? null, lastRefreshedAt: new Date(), updatedAt: new Date() })
      .where(eq(workspaceWidget.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Widget "${id}" not found.`);
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.REFRESHED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.WIDGET,
      metadata: { error: error ?? null },
    });

    await ctx.pubsub.publish(WIDGET_EVENTS.REFRESHED, { error: error ?? null, widgetId: id });

    return updated;
  });

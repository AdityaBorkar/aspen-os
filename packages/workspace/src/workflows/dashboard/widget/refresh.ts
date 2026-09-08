import { workspaceWidget } from "#/db-schemas";
import { WIDGET_EVENTS } from "#/pubsub";
import { RefreshWidgetSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertCanAccess } from "#/workflow-steps/access-service";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";
import { fetchWidgetStep } from "#/workflow-steps/fetch-widget";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const refreshWidget = Workflow.name("workspace.widget.refresh")
  .input(RefreshWidgetSchema)
  .handler(async ({ id, error }, ctx) => {
    const widget = await ctx.step.run(fetchWidgetStep, { id });
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: widget.dashboard_id });
    assertCanAccess(dashboard, ctx.actorId);

    const [updated] = await ctx.db
      .update(workspaceWidget)
      .set({ last_error: error ?? null, last_refreshed_at: new Date(), updated_at: new Date() })
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

import { workspaceDashboard } from "#/db-schemas";
import { assertCanMutate } from "#/services/access-service";
import { MoveWidgetSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";
import { fetchWidgetStep } from "#/workflow-steps/fetch-widget";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const MoveInputSchema = object({ input: MoveWidgetSchema });

export const moveWidget = Workflow.name("workspace.widget.move")
  .input(MoveInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(MoveWidgetSchema, input);
    const widget = await ctx.step.run(fetchWidgetStep, { id: parsed.id });
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: widget.dashboardId });
    await assertCanMutate(dashboard, ctx.actorId);

    const placements = dashboard.layout.map((placement) =>
      placement.widgetId === parsed.id ? { ...parsed.placement, widgetId: parsed.id } : placement,
    );

    const [updated] = await ctx.db
      .update(workspaceDashboard)
      .set({ layout: placements, updatedAt: new Date() })
      .where(eq(workspaceDashboard.id, dashboard.id))
      .returning();

    if (!updated) {
      throw new Error(`Dashboard "${dashboard.id}" not found.`);
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.WIDGET,
      metadata: { placement: parsed.placement },
    });

    return updated;
  });

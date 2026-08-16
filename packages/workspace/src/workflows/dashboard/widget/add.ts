import { workspaceWidget } from "#/db-schemas";
import { WIDGET_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { AddWidgetSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";
import { assertWidgetDatasource, parseWidgetConfig } from "#/workflows/dashboard/widget/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AddInputSchema = object({ input: AddWidgetSchema });

export const addWidget = Workflow.name("workspace.widget.add")
  .input(AddInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AddWidgetSchema, input);
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: parsed.dashboardId });
    await assertCanMutate(dashboard, ctx.actorId);

    assertWidgetDatasource(parsed.type, parsed);
    const config = parseWidgetConfig(parsed.type, parsed.config);

    const [widget] = await ctx.db
      .insert(workspaceWidget)
      .values({
        config,
        dashboardId: parsed.dashboardId,
        domain: parsed.domain ?? null,
        filter: parsed.filter ?? null,
        title: parsed.title,
        type: parsed.type,
        viewId: parsed.viewId ?? null,
      })
      .returning();

    if (!widget) {
      throw new Error("Failed to add widget.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: widget.id,
      entityType: AUDIT_ENTITY_TYPE.WIDGET,
      metadata: { dashboardId: parsed.dashboardId, type: widget.type },
    });

    await ctx.pubsub.publish(WIDGET_EVENTS.ADDED, {
      dashboardId: parsed.dashboardId,
      widgetId: widget.id,
    });

    return widget;
  });

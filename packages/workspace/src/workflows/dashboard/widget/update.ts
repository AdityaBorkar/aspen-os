import { workspaceWidget } from "#/db-schemas";
import { WIDGET_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { UpdateWidgetSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";
import { fetchWidgetStep } from "#/workflow-steps/fetch-widget";
import { assertWidgetDatasource, parseWidgetConfig } from "#/workflows/dashboard/widget/utils";

import { Workflow } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

const UpdateInputSchema = object({ id: string(), input: UpdateWidgetSchema });

export const updateWidget = Workflow.name("workspace.widget.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const widget = await ctx.step.run(fetchWidgetStep, { id });
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: widget.dashboardId });
    await assertCanMutate(dashboard, ctx.actorId);
    const parsed = parse(UpdateWidgetSchema, input);

    const type = parsed.type ?? widget.type;
    const domain = parsed.domain !== undefined ? parsed.domain : widget.domain;
    const filter = parsed.filter !== undefined ? parsed.filter : widget.filter;
    const viewId = parsed.viewId !== undefined ? parsed.viewId : widget.viewId;

    assertWidgetDatasource(type, { domain, filter, viewId });
    const config =
      parsed.config !== undefined ? parseWidgetConfig(type, parsed.config) : widget.config;

    const updates = stripUndefined({
      config,
      domain,
      filter,
      title: parsed.title,
      type: parsed.type,
      viewId,
    });

    const [updated] = await ctx.db
      .update(workspaceWidget)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workspaceWidget.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Widget "${id}" not found.`);
    }

    const previousState = { title: widget.title, type: widget.type };
    const newState = { title: updated.title, type: updated.type };
    // SAFETY: diff() compares JsonValue-typed state snapshots.
    const changes = ctx.audit.diff(previousState, newState) as
      | Record<string, JsonValue>
      | undefined;

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      changes,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.WIDGET,
      metadata: { dashboardId: dashboard.id },
      newState,
      previousState,
    });

    await ctx.pubsub.publish(WIDGET_EVENTS.UPDATED, { dashboardId: dashboard.id, widgetId: id });

    return updated;
  });

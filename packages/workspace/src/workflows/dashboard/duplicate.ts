import { workspaceDashboard, workspaceWidget } from "#/db-schemas";
import { DASHBOARD_EVENTS } from "#/pubsub";
import { assertCanAccess, resolveActorId } from "#/services/access-service";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, WORKSPACE_ACCESS } from "#/utils/constants";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const DuplicateInputSchema = object({ id: IdSchema });

export const duplicateDashboard = Workflow.name("workspace.dashboard.duplicate")
  .input(DuplicateInputSchema)
  .handler(async ({ id }, ctx) => {
    const dashboard = await ctx.step.run(fetchDashboardStep, { id });
    assertCanAccess(dashboard, ctx.actorId);
    const ownerId = resolveActorId(ctx.actorId);

    const widgets = await ctx.db
      .select()
      .from(workspaceWidget)
      .where(eq(workspaceWidget.dashboardId, id));

    const [duplicate] = await ctx.db
      .insert(workspaceDashboard)
      .values({
        access: WORKSPACE_ACCESS.PERSONAL,
        description: dashboard.description,
        metadata: dashboard.metadata,
        name: dashboard.name,
        ownerId,
      })
      .returning();

    if (!duplicate) {
      throw new Error("Failed to duplicate dashboard.");
    }

    const idMap = new Map<string, string>();

    await ctx.step.run("copy-widgets", async () => {
      const results = await Promise.all(
        widgets.map(async (widget) => {
          const [inserted] = await ctx.db
            .insert(workspaceWidget)
            .values({
              config: widget.config,
              dashboardId: duplicate.id,
              domain: widget.domain,
              filter: widget.filter,
              title: widget.title,
              type: widget.type,
              viewId: widget.viewId,
            })
            .returning();
          return { inserted, originalId: widget.id };
        }),
      );
      for (const result of results) {
        if (result.inserted) {
          idMap.set(result.originalId, result.inserted.id);
        }
      }
    });

    // oxlint-disable eslint/id-length
    const layout = dashboard.layout
      .map((placement) => {
        const newId = idMap.get(placement.widgetId);
        return newId
          ? {
              h: placement.h,
              w: placement.w,
              widgetId: newId,
              x: placement.x,
              y: placement.y,
            }
          : null;
      })
      .filter((placement): placement is NonNullable<typeof placement> => placement !== null);
    // oxlint-enable eslint/id-length

    await ctx.db
      .update(workspaceDashboard)
      .set({ layout, updatedAt: new Date() })
      .where(eq(workspaceDashboard.id, duplicate.id));

    await ctx.audit.write({
      action: AUDIT_ACTION.DUPLICATED,
      crudAction: "create",
      entityId: duplicate.id,
      entityType: AUDIT_ENTITY_TYPE.DASHBOARD,
      metadata: { sourceDashboardId: id, widgetCount: widgets.length },
    });

    await ctx.pubsub.publish(DASHBOARD_EVENTS.DUPLICATED, {
      dashboardId: id,
      duplicateId: duplicate.id,
    });

    return duplicate;
  });

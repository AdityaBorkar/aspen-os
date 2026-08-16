import { workspaceDashboard, workspaceWidget } from "#/db-schemas";
import { DASHBOARD_EVENTS } from "#/pubsub";
import { resolveActorId } from "#/services/access-service";
import { ImportDashboardSchema } from "#/types";
import type { WidgetPlacement } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, WORKSPACE_ACCESS } from "#/utils/constants";
import { parseWidgetConfig } from "#/workflows/dashboard/widget/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ImportInputSchema = object({ input: ImportDashboardSchema });

export const importDashboard = Workflow.name("workspace.dashboard.import")
  .input(ImportInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ImportDashboardSchema, input);
    const ownerId = resolveActorId(ctx.actorId);

    const [dashboard] = await ctx.db
      .insert(workspaceDashboard)
      .values({
        access: parsed.access ?? WORKSPACE_ACCESS.PERSONAL,
        description: parsed.dashboard.description ?? null,
        metadata: parsed.dashboard.metadata,
        name: parsed.dashboard.name,
        ownerId,
      })
      .returning();

    if (!dashboard) {
      throw new Error("Failed to import dashboard.");
    }

    const idMap = new Map<string, string>();

    await ctx.step.run("insert-widgets", async () => {
      const results = await Promise.all(
        parsed.widgets.map(async (snapshot, index) => {
          const config = parseWidgetConfig(snapshot.type, snapshot.config);
          const [inserted] = await ctx.db
            .insert(workspaceWidget)
            .values({
              config,
              dashboardId: dashboard.id,
              domain: snapshot.domain ?? null,
              filter: snapshot.filter ?? null,
              title: snapshot.title,
              type: snapshot.type,
              viewId: snapshot.viewId ?? null,
            })
            .returning();
          return { index, inserted };
        }),
      );
      for (const result of results) {
        if (result.inserted) {
          const sourceId = parsed.widgets[result.index]?.id ?? `index:${result.index}`;
          idMap.set(sourceId, result.inserted.id);
        }
      }
    });

    // oxlint-disable eslint/id-length
    const layout = parsed.layout
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
      .filter((placement): placement is WidgetPlacement => placement !== null);
    // oxlint-enable eslint/id-length

    await ctx.db
      .update(workspaceDashboard)
      .set({ layout, updatedAt: new Date() })
      .where(eq(workspaceDashboard.id, dashboard.id));

    await ctx.audit.write({
      action: AUDIT_ACTION.IMPORTED,
      crudAction: "create",
      entityId: dashboard.id,
      entityType: AUDIT_ENTITY_TYPE.DASHBOARD,
      metadata: { widgetCount: parsed.widgets.length },
    });

    await ctx.pubsub.publish(DASHBOARD_EVENTS.CREATED, {
      access: dashboard.access,
      dashboardId: dashboard.id,
      ownerId: dashboard.ownerId,
    });

    return dashboard;
  });

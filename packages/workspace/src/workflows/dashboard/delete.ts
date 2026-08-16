import { workspaceDashboard, workspaceSchedule, workspaceWidget } from "#/db-schemas";
import { DASHBOARD_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const DeleteInputSchema = object({ id: string() });

export const deleteDashboard = Workflow.name("workspace.dashboard.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    const dashboard = await ctx.step.run(fetchDashboardStep, { id });
    await assertCanMutate(dashboard, ctx.actorId);

    await ctx.step.run("delete-widgets", async () => {
      await ctx.db.delete(workspaceWidget).where(eq(workspaceWidget.dashboardId, id));
    });

    await ctx.step.run("delete-schedules", async () => {
      await ctx.db.delete(workspaceSchedule).where(eq(workspaceSchedule.dashboardId, id));
    });

    await ctx.db.delete(workspaceDashboard).where(eq(workspaceDashboard.id, id));

    await ctx.audit.write({
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.DASHBOARD,
    });

    await ctx.pubsub.publish(DASHBOARD_EVENTS.DELETED, { dashboardId: id });

    return { id };
  });

import { workspaceSchedule } from "#/db-schemas";
import { DASHBOARD_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { scheduleCronTopic, unregisterScheduleHandler } from "#/services/schedule-service";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";
import { fetchScheduleStep } from "#/workflow-steps/fetch-schedule";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const PauseInputSchema = object({ id: IdSchema });

export const pauseSchedule = Workflow.name("workspace.schedule.pause")
  .input(PauseInputSchema)
  .handler(async ({ id }, ctx) => {
    const schedule = await ctx.step.run(fetchScheduleStep, { id });
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: schedule.dashboardId });
    await assertCanMutate(dashboard, ctx.actorId);

    await ctx.step.run("unregister-cron", async () => {
      await unregisterScheduleHandler(scheduleCronTopic(id), { pubsub: ctx.pubsub });
    });

    const [updated] = await ctx.db
      .update(workspaceSchedule)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(workspaceSchedule.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Schedule "${id}" not found.`);
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.PAUSED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.SCHEDULE,
      metadata: { dashboardId: schedule.dashboardId },
    });

    await ctx.pubsub.publish(DASHBOARD_EVENTS.UNSCHEDULED, {
      dashboardId: schedule.dashboardId,
      scheduleId: id,
    });

    return updated;
  });

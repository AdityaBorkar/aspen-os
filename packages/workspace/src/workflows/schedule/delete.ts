import { workspaceDeliverySchedule } from "#/db-schemas";
import { DASHBOARD_EVENTS } from "#/pubsub";
import { scheduleCronTopic, unregisterScheduleHandler } from "#/services/schedule-service";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertCanMutate } from "#/workflow-steps/access-service";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";
import { fetchScheduleStep } from "#/workflow-steps/fetch-schedule";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const DeleteInputSchema = object({ id: IdSchema });

export const deleteSchedule = Workflow.name("workspace.schedule.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    const schedule = await ctx.step.run(fetchScheduleStep, { id });
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: schedule.dashboard_id });
    await assertCanMutate(dashboard, ctx.actorId);

    await ctx.step.run("unregister-cron", async () => {
      await unregisterScheduleHandler(scheduleCronTopic(id), { pubsub: ctx.pubsub });
    });

    await ctx.db.delete(workspaceDeliverySchedule).where(eq(workspaceDeliverySchedule.id, id));

    await ctx.audit.write({
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.SCHEDULE,
      metadata: { dashboard_id: schedule.dashboard_id },
    });

    await ctx.pubsub.publish(DASHBOARD_EVENTS.UNSCHEDULED, {
      dashboardId: schedule.dashboard_id,
      scheduleId: id,
    });

    return { id };
  });

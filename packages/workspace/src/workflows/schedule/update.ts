import { workspaceSchedule } from "#/db-schemas";
import { DASHBOARD_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import {
  registerScheduleDelivery,
  scheduleCronTopic,
  unregisterScheduleHandler,
} from "#/services/schedule-service";
import { UpdateScheduleSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";
import { fetchScheduleStep } from "#/workflow-steps/fetch-schedule";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

const UpdateInputSchema = object({ id: string(), input: UpdateScheduleSchema });

export const updateSchedule = Workflow.name("workspace.schedule.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const schedule = await ctx.step.run(fetchScheduleStep, { id });
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: schedule.dashboardId });
    await assertCanMutate(dashboard, ctx.actorId);
    const parsed = parse(UpdateScheduleSchema, input);

    const updates = stripUndefined({
      config: parsed.config,
      cron: parsed.cron,
      isActive: parsed.isActive,
    });

    const [updated] = await ctx.db
      .update(workspaceSchedule)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workspaceSchedule.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Schedule "${id}" not found.`);
    }

    const cronChanged = parsed.cron !== undefined && parsed.cron !== schedule.cron;
    if (cronChanged) {
      await ctx.step.run("re-register-cron", async () => {
        const deps = { audit: ctx.audit, db: ctx.db, pubsub: ctx.pubsub };
        await unregisterScheduleHandler(scheduleCronTopic(id), deps);
        if (updated.isActive) {
          await registerScheduleDelivery(deps, updated);
        }
      });
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.SCHEDULE,
      metadata: { dashboardId: schedule.dashboardId },
    });

    await ctx.pubsub.publish(DASHBOARD_EVENTS.SCHEDULED, {
      dashboardId: schedule.dashboardId,
      scheduleId: id,
    });

    return updated;
  });

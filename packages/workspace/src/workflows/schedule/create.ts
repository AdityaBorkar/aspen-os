import { workspaceSchedule } from "#/db-schemas";
import { DASHBOARD_EVENTS } from "#/pubsub";
import { assertCanMutate, resolveActorId } from "#/services/access-service";
import { registerScheduleDelivery } from "#/services/schedule-service";
import { CreateScheduleSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateScheduleSchema });

export const createSchedule = Workflow.name("workspace.schedule.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateScheduleSchema, input);
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: parsed.dashboardId });
    await assertCanMutate(dashboard, ctx.actorId);
    const createdBy = resolveActorId(ctx.actorId);

    const [schedule] = await ctx.db
      .insert(workspaceSchedule)
      .values({
        config: parsed.config,
        createdBy,
        cron: parsed.cron,
        dashboardId: parsed.dashboardId,
        isActive: parsed.isActive ?? true,
      })
      .returning();

    if (!schedule) {
      throw new Error("Failed to create schedule.");
    }

    if (schedule.isActive) {
      await ctx.step.run("register-cron", async () => {
        await registerScheduleDelivery(
          { audit: ctx.audit, db: ctx.db, pubsub: ctx.pubsub },
          schedule,
        );
      });
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: schedule.id,
      entityType: AUDIT_ENTITY_TYPE.SCHEDULE,
      metadata: { dashboardId: parsed.dashboardId },
    });

    await ctx.pubsub.publish(DASHBOARD_EVENTS.SCHEDULED, {
      dashboardId: parsed.dashboardId,
      scheduleId: schedule.id,
    });

    return schedule;
  });

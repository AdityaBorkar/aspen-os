import { workspaceSchedule } from "#/db-schemas";
import { assertCanAccess } from "#/services/access-service";
import { MarkRunScheduleSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";
import { fetchScheduleStep } from "#/workflow-steps/fetch-schedule";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const MarkRunInputSchema = object({ input: MarkRunScheduleSchema });

export const markRunSchedule = Workflow.name("workspace.schedule.mark-run")
  .input(MarkRunInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(MarkRunScheduleSchema, input);
    const schedule = await ctx.step.run(fetchScheduleStep, { id: parsed.id });
    const dashboard = await ctx.step.run(fetchDashboardStep, { id: schedule.dashboardId });
    assertCanAccess(dashboard, ctx.actorId);

    const [updated] = await ctx.db
      .update(workspaceSchedule)
      .set({
        lastError: parsed.error ?? null,
        lastRunAt: parsed.at ? new Date(parsed.at) : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workspaceSchedule.id, parsed.id))
      .returning();

    if (!updated) {
      throw new Error(`Schedule "${parsed.id}" not found.`);
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.MARKED_RUN,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.SCHEDULE,
      metadata: { dashboardId: schedule.dashboardId, error: parsed.error ?? null },
    });

    return updated;
  });

import { healthcarePlanStage, healthcareTreatmentPlan } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { RescheduleStageSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RescheduleStageInputSchema = object({ input: RescheduleStageSchema });

export const rescheduleStage = Workflow.name("emr.dental.reschedule-stage")
  .input(RescheduleStageInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RescheduleStageSchema, input);
    const actorId = ctx.actorId ?? "system";

    const plan = await ctx.step.run("fetch-treatment-plan", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareTreatmentPlan)
        .where(eq(healthcareTreatmentPlan.id, parsed.planId))
        .limit(1);
      if (!row) {
        throw new Error("Treatment plan not found; build the plan first");
      }
      return row;
    });

    const stages = await ctx.step.run("fetch-plan-stages", async () =>
      ctx.db
        .select()
        .from(healthcarePlanStage)
        .where(eq(healthcarePlanStage.plan_id, parsed.planId))
        .orderBy(asc(healthcarePlanStage.created_at)),
    );
    const stage = stages[parsed.stageIndex];
    if (!stage) {
      throw new Error("Plan stage not found; check the stage index");
    }
    // Sequence guard: a stage cannot move ahead of an earlier open stage.
    const earlierOpen = stages
      .slice(0, parsed.stageIndex)
      .some((earlier) => earlier.stage === "Planned" || earlier.stage === "Scheduled");
    if (earlierOpen) {
      throw new Error(
        "Earlier stages are still open; rescheduling preserves sequence — complete them first",
      );
    }

    const reschedulePayload: Record<string, JsonValue> = {};
    if (parsed.newDate) {
      reschedulePayload.scheduledDate = parsed.newDate;
    }
    if (parsed.newSlot) {
      reschedulePayload.scheduledSlot = parsed.newSlot;
    }
    if (parsed.reason) {
      reschedulePayload.rescheduleReason = parsed.reason;
    }
    const [row] = await ctx.step.run("reschedule-stage", async () =>
      ctx.db
        .update(healthcarePlanStage)
        .set({
          payload: reschedulePayload,
          stage: "Scheduled",
        })
        .where(eq(healthcarePlanStage.id, stage.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to reschedule the stage.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: parsed.planId,
        entityType: AUDIT_ENTITY_TYPE.DENTAL,
        newState: {
          id: parsed.planId,
          newDate: parsed.newDate,
          stageId: row.id,
        },
      });
      await ctx.pubsub.publish(DENTAL_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: parsed.planId,
      });
    });

    return {
      id: parsed.planId,
      newDate: parsed.newDate,
      newSlot: parsed.newSlot ?? null,
      patientId: plan.patient_id,
      stage: row.stage,
      stageId: row.id,
    };
  });

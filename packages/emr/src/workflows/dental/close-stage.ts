import { healthcarePlanStage, healthcareTreatmentPlan } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { ClosePlanStageSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CloseStageInputSchema = object({ input: ClosePlanStageSchema });

export const closeStage = Workflow.name("emr.dental.closeStage")
  .input(CloseStageInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ClosePlanStageSchema, input);
    const actorId = ctx.actorId ?? "system";

    await ctx.step.run("fetch-treatment-plan", async () => {
      const [row] = await ctx.db
        .select({ id: healthcareTreatmentPlan.id })
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

    // D5: signed-consent gate deleted with the consent stores.

    if (parsed.to === "Done") {
      if (!parsed.note || parsed.note.trim().length === 0) {
        throw new Error("Stage cannot close without a clinical note; add the note first");
      }
      if (!parsed.nextAppointment && parsed.completed !== true) {
        throw new Error(
          "Stage cannot close without a next appointment or completion flag; set one of them",
        );
      }
    }

    const stagePayload: Record<string, JsonValue> = {};
    if (parsed.note) {
      stagePayload.closeNote = parsed.note;
    }
    if (parsed.nextAppointment) {
      stagePayload.nextAppointment = parsed.nextAppointment;
    }
    if (parsed.completed !== undefined) {
      stagePayload.completed = parsed.completed;
    }
    const [row] = await ctx.step.run("update-plan-stage", async () =>
      ctx.db
        .update(healthcarePlanStage)
        .set({
          payload: stagePayload,
          stage: parsed.to,
        })
        .where(eq(healthcarePlanStage.id, stage.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to move the plan stage.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: parsed.planId,
        entityType: AUDIT_ENTITY_TYPE.DENTAL,
        newState: { id: parsed.planId, stage: row.stage, stageId: row.id },
      });
      await ctx.pubsub.publish(DENTAL_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: parsed.planId,
      });
    });

    const openStages = await ctx.step.run("count-open-stages", async () =>
      ctx.db
        .select({ id: healthcarePlanStage.id })
        .from(healthcarePlanStage)
        .where(
          and(
            eq(healthcarePlanStage.plan_id, parsed.planId),
            eq(healthcarePlanStage.stage, "Planned"),
          ),
        ),
    );

    return {
      completed: parsed.completed ?? null,
      id: parsed.planId,
      nextAppointment: parsed.nextAppointment ?? null,
      note: parsed.note ?? null,
      openStages: openStages.length,
      planClosable: openStages.length === 0,
      stage: row.stage,
      stageId: row.id,
    };
  });

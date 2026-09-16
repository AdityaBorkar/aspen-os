import { healthcarePlanStage, healthcareTreatmentPlan } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { ImplantMilestoneSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ImplantMilestoneInputSchema = object({ input: ImplantMilestoneSchema });

interface ImplantMilestonePayload {
  [key: string]: string | undefined;
  healingNote?: string;
  implantMilestone: string;
}

export const implantMilestone = Workflow.name("emr.dental.implant-milestone")
  .input(ImplantMilestoneInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ImplantMilestoneSchema, input);
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

    if (parsed.milestone === "loading") {
      const healing = await ctx.step.run("check-healing-note", async () =>
        ctx.db
          .select()
          .from(healthcarePlanStage)
          .where(eq(healthcarePlanStage.plan_id, parsed.planId)),
      );
      const healed = healing.some((candidate) => {
        const { payload: healingPayload } = candidate;
        return healingPayload.implantMilestone === "healing";
      });
      if (!healed) {
        throw new Error("Loading blocked: record the healing milestone note first");
      }
    }

    const milestonePayload: ImplantMilestonePayload = {
      implantMilestone: parsed.milestone,
    };
    if (parsed.healingNote) {
      milestonePayload.healingNote = parsed.healingNote;
    }
    const [row] = await ctx.step.run("record-milestone", async () =>
      ctx.db
        .update(healthcarePlanStage)
        .set({
          payload: milestonePayload,
        })
        .where(eq(healthcarePlanStage.id, stage.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the implant milestone.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: parsed.planId,
        entityType: AUDIT_ENTITY_TYPE.DENTAL,
        newState: {
          id: parsed.planId,
          milestone: parsed.milestone,
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
      milestone: parsed.milestone,
      patientId: plan.patient_id,
      stageId: row.id,
    };
  });

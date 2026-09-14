import { healthcarePlanStage, healthcareTreatmentPlan } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { DentalPackageSchema, ImplantMilestoneSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ImplantMilestoneInputSchema = object({ input: ImplantMilestoneSchema });

export const implantMilestone = Workflow.name("healthcare.dental.implantMilestone")
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
      const healed = healing.some((s) => {
        const payload =
          s.payload && typeof s.payload === "object" ? (s.payload as Record<string, unknown>) : {};
        return payload.implantMilestone === "healing";
      });
      if (!healed) {
        throw new Error("Loading blocked: record the healing milestone note first");
      }
    }

    const [row] = await ctx.step.run("record-milestone", async () =>
      ctx.db
        .update(healthcarePlanStage)
        .set({
          payload: {
            implantMilestone: parsed.milestone,
            ...(parsed.healingNote ? { healingNote: parsed.healingNote } : {}),
          },
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

const DentalPackageInputSchema = object({ input: DentalPackageSchema });

export const sellDentalPackage = Workflow.name("healthcare.dental.sellPackage")
  .input(DentalPackageInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DentalPackageSchema, input);
    const branchId = parsed.branchId ?? "main";
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
    if (plan.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the treatment plan; check the selected patient");
    }

    const stages = await ctx.step.run("fetch-plan-stages", async () =>
      ctx.db
        .select()
        .from(healthcarePlanStage)
        .where(eq(healthcarePlanStage.plan_id, parsed.planId))
        .orderBy(asc(healthcarePlanStage.created_at)),
    );

    const [row] = await ctx.step.run("link-package", async () =>
      ctx.db
        .update(healthcareTreatmentPlan)
        .set({
          payload: {
            packageName: parsed.name,
            packagePrice: parsed.price,
            packagedStages: stages.map((s) => s.id),
          },
        })
        .where(eq(healthcareTreatmentPlan.id, parsed.planId))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to link the package.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.DENTAL,
        newState: {
          id: row.id,
          packageName: parsed.name,
          stageCount: stages.length,
        },
      });
      await ctx.pubsub.publish(DENTAL_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      id: row.id,
      packageName: parsed.name,
      packagePrice: parsed.price,
      patientId: row.patient_id,
      stageCount: stages.length,
      stageIds: stages.map((s) => s.id),
    };
  });

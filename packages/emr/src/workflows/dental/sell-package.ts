import { healthcarePlanStage, healthcareTreatmentPlan } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { DentalPackageSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DentalPackageInputSchema = object({ input: DentalPackageSchema });

export const sellDentalPackage = Workflow.name("emr.dental.sell-package")
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
            packagedStages: stages.map((stage) => stage.id),
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
      stageIds: stages.map((stage) => stage.id),
    };
  });

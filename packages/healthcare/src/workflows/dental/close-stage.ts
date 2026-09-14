import {
  healthcareDentalConsent,
  healthcarePlanStage,
  healthcareTreatmentPlan,
} from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { ClosePlanStageSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CloseStageInputSchema = object({ input: ClosePlanStageSchema });

export const closeStage = Workflow.name("healthcare.dental.closeStage")
  .input(CloseStageInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ClosePlanStageSchema, input);
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

    if (parsed.to === "InChair" || parsed.to === "Done") {
      const signed = await ctx.step.run("check-signed-consent", async () => {
        const [row] = await ctx.db
          .select({ id: healthcareDentalConsent.id })
          .from(healthcareDentalConsent)
          .where(
            and(
              eq(healthcareDentalConsent.encounter_id, plan.encounter_id),
              eq(healthcareDentalConsent.patient_id, plan.patient_id),
              eq(healthcareDentalConsent.status, "Signed"),
            ),
          )
          .limit(1);
        return row;
      });
      if (!signed) {
        throw new Error(
          "Consent must be signed before the first sitting; complete the consent form first",
        );
      }
    }

    const [row] = await ctx.step.run("update-plan-stage", async () =>
      ctx.db
        .update(healthcarePlanStage)
        .set({ stage: parsed.to })
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

    return {
      id: parsed.planId,
      stage: row.stage,
      stageId: row.id,
    };
  });

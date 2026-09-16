import { healthcarePlanStage, healthcareTreatmentPlan } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { CreateTreatmentPlanSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const BuildPlanInputSchema = object({ input: CreateTreatmentPlanSchema });

export const buildPlan = Workflow.name("emr.dental.buildPlan")
  .input(BuildPlanInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateTreatmentPlanSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });

    const [plan] = await ctx.step.run("insert-treatment-plan", async () =>
      ctx.db
        .insert(healthcareTreatmentPlan)
        .values({
          branch_id: branchId,
          created_by: actorId,
          encounter_id: parsed.encounterId,
          patient_id: parsed.patientId,
          status: parsed.status,
        })
        .returning(),
    );
    if (!plan) {
      throw new Error("Failed to build the treatment plan.");
    }

    const stages = await ctx.step.run("insert-plan-stages", async () =>
      ctx.db
        .insert(healthcarePlanStage)
        .values(
          parsed.stages.map((stage) => ({
            branch_id: branchId,
            created_by: actorId,
            patient_id: parsed.patientId,
            plan_id: plan.id,
            price: String(stage.price),
            procedure: stage.procedure,
            stage: stage.stage,
            tooth: stage.tooth ?? null,
          })),
        )
        .returning(),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: plan.id,
        entityType: AUDIT_ENTITY_TYPE.DENTAL,
        newState: {
          encounterId: parsed.encounterId,
          id: plan.id,
          patientId: parsed.patientId,
          stageCount: stages.length,
          status: parsed.status,
        },
      });
      await ctx.pubsub.publish(DENTAL_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: plan.id,
      });
    });

    return {
      branchId,
      encounterId: parsed.encounterId,
      id: plan.id,
      patientId: parsed.patientId,
      stages: stages.map((stage) => ({
        id: stage.id,
        price: Number(stage.price),
        procedure: stage.procedure,
        stage: stage.stage,
        tooth: stage.tooth,
      })),
      status: parsed.status,
    };
  });

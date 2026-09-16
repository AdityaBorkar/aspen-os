import { healthcareSafetyPlan } from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { CreateSafetyPlanSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SaveSafetyPlanInputSchema = object({ input: CreateSafetyPlanSchema });

export const saveSafetyPlan = Workflow.name("emr.psych.saveSafetyPlan")
  .input(SaveSafetyPlanInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateSafetyPlanSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });

    const [row] = await ctx.step.run("insert-safety-plan", async () =>
      ctx.db
        .insert(healthcareSafetyPlan)
        .values({
          branch_id: branchId,
          contacts: parsed.contacts,
          coping_strategies: parsed.copingStrategies,
          created_by: actorId,
          encounter_id: parsed.encounterId,
          means_restriction: parsed.meansRestriction,
          patient_id: parsed.patientId,
          warning_signs: parsed.warningSigns,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save the safety plan.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: {
          encounterId: row.encounter_id,
          id: row.id,
          patientId: row.patient_id,
        },
      });
      await ctx.pubsub.publish(PSYCH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      encounterId: row.encounter_id,
      id: row.id,
      patientId: row.patient_id,
    };
  });

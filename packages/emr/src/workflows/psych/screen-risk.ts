import { healthcareRiskFlag } from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { CreateRiskScreenSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ScreenRiskInputSchema = object({ input: CreateRiskScreenSchema });

export const screenRisk = Workflow.name("emr.psych.screenRisk")
  .input(ScreenRiskInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateRiskScreenSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });

    const [row] = await ctx.step.run("insert-risk-flag", async () =>
      ctx.db
        .insert(healthcareRiskFlag)
        .values({
          branch_id: branchId,
          created_by: actorId,
          encounter_id: parsed.encounterId,
          factors: parsed.factors,
          level: parsed.level,
          patient_id: parsed.patientId,
          payload: { alerts: [] },
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the risk screen.");
    }

    const needsPlan = parsed.level === "Moderate" || parsed.level === "High";
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: {
          id: row.id,
          level: row.level,
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
      factors: row.factors,
      id: row.id,
      level: row.level,
      nextStep: needsPlan
        ? "Moderate/High risk: save a safety plan and alert a senior before further sessions"
        : null,
      patientId: row.patient_id,
    };
  });

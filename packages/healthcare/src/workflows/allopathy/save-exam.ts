import { healthcareExamFinding } from "#/db-schemas/allopathy";
import { ALLOPATHY_EVENTS } from "#/pubsub";
import { CreateExamFindingSchema } from "#/schemas/allopathy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SaveExamInputSchema = object({ input: CreateExamFindingSchema });

export const saveExam = Workflow.name("healthcare.allopathy.saveExam")
  .input(SaveExamInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateExamFindingSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });

    const [row] = await ctx.step.run("insert-exam-finding", async () =>
      ctx.db
        .insert(healthcareExamFinding)
        .values({
          branch_id: branchId,
          created_by: actorId,
          encounter_id: parsed.encounterId,
          finding: parsed.finding,
          patient_id: parsed.patientId,
          severity: parsed.severity ?? null,
          system: parsed.system,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save the examination finding.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ALLOPATHY,
        newState: {
          encounterId: row.encounter_id,
          id: row.id,
          patientId: row.patient_id,
          system: row.system,
        },
      });
      await ctx.pubsub.publish(ALLOPATHY_EVENTS.CREATED, {
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
      finding: row.finding,
      id: row.id,
      patientId: row.patient_id,
      severity: row.severity,
      system: row.system,
    };
  });

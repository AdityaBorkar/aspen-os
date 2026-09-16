import { healthcareAyushCaseSheet } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { CreateAyushCaseSheetSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SaveCaseSheetInputSchema = object({ input: CreateAyushCaseSheetSchema });

export const saveCaseSheet = Workflow.name("emr.ayush.save-case-sheet")
  .input(SaveCaseSheetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateAyushCaseSheetSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });

    const [row] = await ctx.step.run("insert-case-sheet", async () =>
      ctx.db
        .insert(healthcareAyushCaseSheet)
        .values({
          branch_id: branchId,
          complaints: parsed.complaints,
          created_by: actorId,
          dosha: parsed.dosha,
          encounter_id: parsed.encounterId,
          history: parsed.history ?? null,
          nadi: parsed.nadi,
          pathy: parsed.pathy,
          patient_id: parsed.patientId,
          payload: {
            agni: parsed.agni ?? null,
            diagnoses: [],
            followupGrid: [],
            followups: [],
            koshtha: parsed.koshtha ?? null,
            mala: parsed.mala ?? null,
            planLines: parsed.planLines ?? [],
          },
          prakriti: parsed.prakriti,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save the AYUSH case sheet.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          encounterId: row.encounter_id,
          id: row.id,
          pathy: row.pathy,
          patientId: row.patient_id,
        },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      complaints: row.complaints,
      createdAt: row.created_at.toISOString(),
      dosha: row.dosha,
      encounterId: row.encounter_id,
      history: row.history,
      id: row.id,
      nadi: row.nadi,
      pathy: row.pathy,
      patientId: row.patient_id,
      prakriti: row.prakriti,
    };
  });

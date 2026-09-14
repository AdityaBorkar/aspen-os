import {
  healthcareClinicOrder,
  healthcareEncounterAddendum,
  healthcareEncounterDiagnosis,
  healthcareFollowUp,
  healthcarePrescription,
  healthcareVitals,
} from "#/db-schemas/encounters";
import { EncounterIdSchema } from "#/schemas/encounters";
import {
  fetchEncounterStep,
  toClinicOrderDto,
  toDiagnosisDto,
  toEncounterAddendumDto,
  toEncounterDto,
  toFollowUpDto,
  toPrescriptionDto,
  toVitalsDto,
} from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const GetInputSchema = object({ input: EncounterIdSchema });

export const getEncounter = Workflow.name("healthcare.encounters.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(EncounterIdSchema, input);
    const encounter = await ctx.step.run(fetchEncounterStep, {
      id: parsed.id,
    });
    const aggregate = await ctx.step.run("fetch-aggregate", async () => {
      const encounterFilter = eq(healthcareEncounterDiagnosis.encounter_id, parsed.id);
      const [diagnoses, prescriptions, vitals, orders, followUps, addenda] = await Promise.all([
        ctx.db.select().from(healthcareEncounterDiagnosis).where(encounterFilter),
        ctx.db
          .select()
          .from(healthcarePrescription)
          .where(eq(healthcarePrescription.encounter_id, parsed.id)),
        ctx.db.select().from(healthcareVitals).where(eq(healthcareVitals.encounter_id, parsed.id)),
        ctx.db
          .select()
          .from(healthcareClinicOrder)
          .where(eq(healthcareClinicOrder.encounter_id, parsed.id)),
        ctx.db
          .select()
          .from(healthcareFollowUp)
          .where(eq(healthcareFollowUp.encounter_id, parsed.id)),
        ctx.db
          .select()
          .from(healthcareEncounterAddendum)
          .where(eq(healthcareEncounterAddendum.encounter_id, parsed.id)),
      ]);
      return { addenda, diagnoses, followUps, orders, prescriptions, vitals };
    });
    return {
      addenda: aggregate.addenda.map(toEncounterAddendumDto),
      diagnoses: aggregate.diagnoses.map(toDiagnosisDto),
      encounter: toEncounterDto(encounter),
      followUps: aggregate.followUps.map(toFollowUpDto),
      orders: aggregate.orders.map(toClinicOrderDto),
      prescriptions: aggregate.prescriptions.map(toPrescriptionDto),
      vitals: aggregate.vitals.map(toVitalsDto),
    };
  });

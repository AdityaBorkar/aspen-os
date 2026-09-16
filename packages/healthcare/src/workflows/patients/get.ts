import { healthcareAllergy, healthcareFamilyLink, healthcareFlag } from "#/db-schemas/patient";
import { PatientIdSchema } from "#/schemas/patients";
import { fetchPatientStep, toPatientDto } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const GetInputSchema = object({ input: PatientIdSchema });

export const getPatient = Workflow.name("healthcare.patients.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PatientIdSchema, input);
    const patient = await ctx.step.run(fetchPatientStep, { id: parsed.id });

    const [links, allergies, flags] = await Promise.all([
      ctx.step.run("load-links", async () =>
        ctx.db
          .select()
          .from(healthcareFamilyLink)
          .where(eq(healthcareFamilyLink.patient_id, patient.id)),
      ),
      ctx.step.run("load-allergies", async () =>
        ctx.db.select().from(healthcareAllergy).where(eq(healthcareAllergy.patient_id, patient.id)),
      ),
      ctx.step.run("load-flags", async () =>
        ctx.db.select().from(healthcareFlag).where(eq(healthcareFlag.patient_id, patient.id)),
      ),
    ]);

    return {
      allergies: allergies.map((row) => ({
        id: row.id,
        name: row.name,
        note: row.note,
        patientId: row.patient_id,
        severity: row.severity,
      })),
      flags: flags.map((row) => ({
        id: row.id,
        label: row.label,
        level: row.level,
        patientId: row.patient_id,
      })),
      links: links.map((row) => ({
        id: row.id,
        linkedName: row.linked_name,
        linkedPhone: row.linked_phone,
        patientId: row.patient_id,
        relation: row.relation,
      })),
      patient: toPatientDto(patient),
    };
  });

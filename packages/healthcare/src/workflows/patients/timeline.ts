import {
  healthcareAllergy,
  healthcareCommunication,
  healthcareFamilyLink,
  healthcareFlag,
  healthcareMergeRequest,
  healthcareRecall,
  healthcareShareSlip,
} from "#/db-schemas/patient";
import { PatientIdSchema } from "#/schemas/patients";
import { fetchPatientStep, toPatientDto } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { eq, or } from "drizzle-orm";
import { object, parse } from "valibot";

const TimelineInputSchema = object({ input: PatientIdSchema });

export const patientTimeline = Workflow.name("healthcare.patients.timeline")
  .input(TimelineInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PatientIdSchema, input);
    const patient = await ctx.step.run(fetchPatientStep, { id: parsed.id });
    const patientId = patient.id;

    const [links, allergies, flags, communications, recalls, slips, merges] = await Promise.all([
      ctx.step.run("load-links", async () =>
        ctx.db
          .select()
          .from(healthcareFamilyLink)
          .where(eq(healthcareFamilyLink.patient_id, patientId)),
      ),
      ctx.step.run("load-allergies", async () =>
        ctx.db.select().from(healthcareAllergy).where(eq(healthcareAllergy.patient_id, patientId)),
      ),
      ctx.step.run("load-flags", async () =>
        ctx.db.select().from(healthcareFlag).where(eq(healthcareFlag.patient_id, patientId)),
      ),
      ctx.step.run("load-communications", async () =>
        ctx.db
          .select()
          .from(healthcareCommunication)
          .where(eq(healthcareCommunication.patient_id, patientId)),
      ),
      ctx.step.run("load-recalls", async () =>
        ctx.db.select().from(healthcareRecall).where(eq(healthcareRecall.patient_id, patientId)),
      ),
      ctx.step.run("load-slips", async () =>
        ctx.db
          .select()
          .from(healthcareShareSlip)
          .where(eq(healthcareShareSlip.patient_id, patientId)),
      ),
      ctx.step.run("load-merges", async () =>
        ctx.db
          .select()
          .from(healthcareMergeRequest)
          .where(
            or(
              eq(healthcareMergeRequest.primary_id, patientId),
              eq(healthcareMergeRequest.duplicate_id, patientId),
            ),
          ),
      ),
    ]);

    return {
      allergies: allergies.map((row) => ({
        id: row.id,
        name: row.name,
        note: row.note,
        severity: row.severity,
      })),
      communications: communications.map((row) => ({
        channel: row.channel,
        createdAt: row.created_at.toISOString(),
        id: row.id,
        message: row.message,
      })),
      // D5: consent history deleted with the consent stores.
      // Hook for the encounters/appointments slice: encounter rows live outside
      // the patients group, so consumers join them by patient id separately.
      encounterIds: [],
      familyLinks: links.map((row) => ({
        id: row.id,
        linkedName: row.linked_name,
        linkedPhone: row.linked_phone,
        relation: row.relation,
      })),
      flags: flags.map((row) => ({ id: row.id, label: row.label, level: row.level })),
      mergeRequests: merges.map((row) => ({
        duplicateId: row.duplicate_id,
        id: row.id,
        primaryId: row.primary_id,
        status: row.status,
      })),
      patient: toPatientDto(patient),
      recalls: recalls.map((row) => ({
        at: row.at,
        id: row.id,
        reason: row.reason,
        status: row.status,
      })),
      shareSlips: slips.map((row) => ({
        createdAt: row.created_at.toISOString(),
        id: row.id,
        text: row.text,
      })),
    };
  });

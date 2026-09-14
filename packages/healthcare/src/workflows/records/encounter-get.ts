import { healthcareSoapNote } from "#/db-schemas/allopathy";
import {
  healthcareClinicOrder,
  healthcareEncounter,
  healthcareEncounterDiagnosis,
  healthcarePrescription,
  healthcareVitals,
} from "#/db-schemas/encounters";
import {
  healthcareClinicalDocument,
  healthcareDischargeSummary,
  healthcareMedicalAddendum,
} from "#/db-schemas/records";
import { RECORDS_EVENTS } from "#/pubsub";
import { EncounterGetSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const EncounterGetInputSchema = object({ input: EncounterGetSchema });

export const encounterGet = Workflow.name("healthcare.records.encounter-get")
  .input(EncounterGetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(EncounterGetSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [encounter, vitals, soap, diagnoses, prescriptions, orders, addenda, discharges, docs] =
      await ctx.step.run("load-encounter", async () =>
        Promise.all([
          ctx.db
            .select()
            .from(healthcareEncounter)
            .where(
              and(
                eq(healthcareEncounter.branch_id, branchId),
                eq(healthcareEncounter.id, parsed.encounterId),
              ),
            )
            .limit(1),
          ctx.db
            .select()
            .from(healthcareVitals)
            .where(
              and(
                eq(healthcareVitals.branch_id, branchId),
                eq(healthcareVitals.encounter_id, parsed.encounterId),
              ),
            )
            .limit(20),
          ctx.db
            .select()
            .from(healthcareSoapNote)
            .where(
              and(
                eq(healthcareSoapNote.branch_id, branchId),
                eq(healthcareSoapNote.encounter_id, parsed.encounterId),
              ),
            )
            .limit(20),
          ctx.db
            .select()
            .from(healthcareEncounterDiagnosis)
            .where(
              and(
                eq(healthcareEncounterDiagnosis.branch_id, branchId),
                eq(healthcareEncounterDiagnosis.encounter_id, parsed.encounterId),
              ),
            )
            .limit(50),
          ctx.db
            .select()
            .from(healthcarePrescription)
            .where(
              and(
                eq(healthcarePrescription.branch_id, branchId),
                eq(healthcarePrescription.encounter_id, parsed.encounterId),
              ),
            )
            .limit(20),
          ctx.db
            .select()
            .from(healthcareClinicOrder)
            .where(
              and(
                eq(healthcareClinicOrder.branch_id, branchId),
                eq(healthcareClinicOrder.encounter_id, parsed.encounterId),
              ),
            )
            .limit(100),
          ctx.db
            .select()
            .from(healthcareMedicalAddendum)
            .where(
              and(
                eq(healthcareMedicalAddendum.branch_id, branchId),
                eq(healthcareMedicalAddendum.encounter_id, parsed.encounterId),
              ),
            )
            .limit(100),
          ctx.db
            .select()
            .from(healthcareDischargeSummary)
            .where(
              and(
                eq(healthcareDischargeSummary.branch_id, branchId),
                eq(healthcareDischargeSummary.encounter_id, parsed.encounterId),
              ),
            )
            .limit(10),
          ctx.db
            .select()
            .from(healthcareClinicalDocument)
            .where(
              and(
                eq(healthcareClinicalDocument.branch_id, branchId),
                eq(healthcareClinicalDocument.encounter_id, parsed.encounterId),
              ),
            )
            .limit(100),
        ]),
      );
    const [found] = encounter;
    if (!found && addenda.length === 0 && discharges.length === 0 && docs.length === 0) {
      throw new Error("Encounter not found; verify the encounter id and retry");
    }

    await ctx.step.run("audit-view", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.VIEWED,
        crudAction: "create",
        entityId: parsed.encounterId,
        entityType: AUDIT_ENTITY_TYPE.RECORDS,
        newState: { encounterId: parsed.encounterId },
      });
      await ctx.pubsub.publish(RECORDS_EVENTS.VIEWED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: parsed.encounterId,
      });
    });

    return {
      addenda: addenda.map((row) => ({
        authorId: row.author_id,
        createdAt: row.created_at.toISOString(),
        id: row.id,
        note: row.note,
      })),
      diagnoses: diagnoses.map((row) => ({
        code: row.code,
        id: row.id,
        isPrimary: row.is_primary,
        label: row.label,
      })),
      discharges: discharges.map((row) => ({
        id: row.id,
        issuedAt: row.issued_at.toISOString(),
        summary: row.summary,
      })),
      documents: docs.map((row) => ({
        fileType: row.file_type,
        id: row.id,
        label: row.label,
        verified: row.verified,
      })),
      encounter: found
        ? {
            id: found.id,
            patientId: found.patient_id,
            specialty: found.specialty,
            status: found.status,
            visitType: found.visit_type,
          }
        : null,
      encounterId: parsed.encounterId,
      orders: orders.map((row) => ({
        id: row.id,
        item: row.item,
        kind: row.kind,
        status: row.status,
      })),
      prescriptions: prescriptions.map((row) => ({
        encounterId: row.encounter_id,
        id: row.id,
        itemCount: row.item_count,
        items: row.payload.items ?? [],
      })),
      soap: soap.map((row) => ({
        assessment: row.assessment,
        id: row.id,
        objective: row.objective,
        plan: row.plan,
        subjective: row.subjective,
      })),
      vitals: vitals.map((row) => ({
        bp: row.bp,
        id: row.id,
        pulse: row.pulse,
        spo2: row.spo2,
        tempC: row.temp_c === null ? null : Number(row.temp_c),
      })),
    };
  });

import { healthcareEncounterDiagnosis, healthcarePrescription } from "#/db-schemas/encounters";
import { ENCOUNTER_EVENTS } from "#/pubsub";
import { PrescribeSchema } from "#/schemas/encounters";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep, toPrescriptionDto } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const PrescribeInputSchema = object({ input: PrescribeSchema });

export const prescribe = Workflow.name("healthcare.encounters.prescribe")
  .input(PrescribeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PrescribeSchema, input);
    const encounter = await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });
    if (parsed.items.length === 0) {
      throw new Error("Prescription needs at least one item.");
    }
    const diagnosisCount = await ctx.step.run("require-diagnosis", async () => {
      const rows = await ctx.db
        .select({ id: healthcareEncounterDiagnosis.id })
        .from(healthcareEncounterDiagnosis)
        .where(eq(healthcareEncounterDiagnosis.encounter_id, parsed.encounterId))
        .limit(1);
      return rows.length;
    });
    if (diagnosisCount === 0) {
      throw new Error(
        `Encounter ${parsed.encounterId} has no diagnosis; record at least one diagnosis before prescribing.`,
      );
    }
    const requiredAcks: Record<string, true> = {};
    for (const item of parsed.items) {
      for (const warning of item.warnings ?? []) {
        requiredAcks[`${item.drug}:${warning}`] = true;
      }
    }
    const acked: Record<string, true> = {};
    for (const key of parsed.acknowledgedWarnings ?? []) {
      acked[key] = true;
    }
    const missing = Object.keys(requiredAcks).filter((key) => !acked[key]);
    if (missing.length > 0) {
      throw new Error(
        `Prescription has unacknowledged warnings: ${missing.join(", ")}. Acknowledge each warning and retry.`,
      );
    }
    const [row] = await ctx.step.run("insert-prescription", async () =>
      ctx.db
        .insert(healthcarePrescription)
        .values({
          branch_id: encounter.branch_id,
          encounter_id: parsed.encounterId,
          id: crypto.randomUUID(),
          item_count: parsed.items.length,
          patient_id: parsed.patientId,
          payload: {
            acknowledgedWarnings: parsed.acknowledgedWarnings ?? [],
            items: parsed.items,
          },
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save prescription.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ENCOUNTER,
        newState: { encounterId: row.encounter_id, id: row.id },
      });
      await ctx.pubsub.publish(ENCOUNTER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: encounter.branch_id,
        id: parsed.encounterId,
      });
    });
    return toPrescriptionDto(row);
  });

import { healthcarePrescription } from "#/db-schemas/encounters";
import { ENCOUNTER_EVENTS } from "#/pubsub";
import { RefillSchema } from "#/schemas/encounters";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep, toPrescriptionDto } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const REFILL_WINDOW_DAYS = 180;

const RefillInputSchema = object({ input: RefillSchema });

export const refillPrescription = Workflow.name("healthcare.encounters.refill")
  .input(RefillInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RefillSchema, input);
    const encounter = await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });
    const original = await ctx.step.run("fetch-original", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcarePrescription)
        .where(eq(healthcarePrescription.id, parsed.prescriptionId))
        .limit(1);
      if (!row) {
        throw new Error(`Prescription ${parsed.prescriptionId} not found; check the ID and retry.`);
      }
      return row;
    });
    if (original.patient_id !== parsed.patientId) {
      throw new Error(
        `Prescription ${parsed.prescriptionId} belongs to another patient; verify the patient and retry.`,
      );
    }
    const ageDays = (Date.now() - original.created_at.getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays > REFILL_WINDOW_DAYS) {
      throw new Error(
        `Prescription ${parsed.prescriptionId} is ${Math.floor(ageDays)} days old; only prescriptions used within the last ${REFILL_WINDOW_DAYS} days can be refilled.`,
      );
    }
    const { payload } = original;
    const [row] = await ctx.step.run("insert-refill", async () =>
      ctx.db
        .insert(healthcarePrescription)
        .values({
          branch_id: encounter.branch_id,
          encounter_id: parsed.encounterId,
          id: crypto.randomUUID(),
          item_count: original.item_count,
          patient_id: parsed.patientId,
          payload: {
            ...payload,
            refillOf: parsed.prescriptionId,
          },
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save refill.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ENCOUNTER,
        newState: { id: row.id, refillOf: parsed.prescriptionId },
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

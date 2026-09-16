import { healthcareControlledPrescription } from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { CreateControlledPrescriptionSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const PrescribeControlledInputSchema = object({
  input: CreateControlledPrescriptionSchema,
});

export const prescribeControlled = Workflow.name("healthcare.psych.prescribeControlled")
  .input(PrescribeControlledInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateControlledPrescriptionSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });

    // Max-days cap: controlled supply beyond the cap needs a psychiatrist
    // override with a reason.
    const cap = parsed.maxDays ?? 30;
    if (parsed.daysSupply > cap && (!parsed.override || !parsed.overrideReason)) {
      throw new Error(
        `Controlled supply is capped at ${cap} days; add a psychiatrist override with a reason for a longer course`,
      );
    }

    // Early-refill guard: refilling before the previous supply ran out
    // needs an override plus a reason.
    if (parsed.lastRefillAt) {
      const elapsedDays =
        (Date.now() - new Date(parsed.lastRefillAt).getTime()) / (24 * 60 * 60 * 1000);
      if (elapsedDays < parsed.daysSupply) {
        if (!parsed.override || !parsed.overrideReason) {
          throw new Error(
            "Early refill needs an override with a reason; the previous supply has not run out",
          );
        }
      }
    }

    const [row] = await ctx.step.run("insert-controlled-prescription", async () =>
      ctx.db
        .insert(healthcareControlledPrescription)
        .values({
          branch_id: branchId,
          created_by: actorId,
          days_supply: parsed.daysSupply,
          encounter_id: parsed.encounterId,
          last_refill_at: parsed.lastRefillAt ? new Date(parsed.lastRefillAt) : null,
          medicine: parsed.medicine,
          override: parsed.override ?? false,
          override_reason: parsed.overrideReason ?? null,
          patient_id: parsed.patientId,
          qty: parsed.qty,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the controlled prescription.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: parsed.override ? AUDIT_ACTION.OVERRIDE : AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: {
          daysSupply: row.days_supply,
          id: row.id,
          medicine: row.medicine,
          override: row.override,
          patientId: row.patient_id,
          qty: row.qty,
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
      daysSupply: row.days_supply,
      encounterId: row.encounter_id,
      id: row.id,
      lastRefillAt: row.last_refill_at ? row.last_refill_at.toISOString() : null,
      medicine: row.medicine,
      override: row.override,
      patientId: row.patient_id,
      qty: row.qty,
    };
  });

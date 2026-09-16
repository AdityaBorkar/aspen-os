import { healthcareControlledPrescription, healthcareSideEffectCheck } from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { CreateSideEffectCheckSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SideEffectCheckInputSchema = object({
  input: CreateSideEffectCheckSchema,
});

export const sideEffectCheck = Workflow.name("emr.psych.sideEffectCheck")
  .input(SideEffectCheckInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateSideEffectCheckSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const rx = await ctx.step.run("fetch-prescription", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareControlledPrescription)
        .where(eq(healthcareControlledPrescription.id, parsed.prescriptionId))
        .limit(1);
      if (!row) {
        throw new Error("Prescription not found; prescribe first");
      }
      return row;
    });
    if (rx.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the prescription; check the selected patient");
    }

    const [row] = await ctx.step.run("insert-side-effect-check", async () =>
      ctx.db
        .insert(healthcareSideEffectCheck)
        .values({
          branch_id: branchId,
          created_by: actorId,
          effects: parsed.effects,
          patient_id: parsed.patientId,
          payload: {
            eps: parsed.eps ?? "none",
            metabolic: parsed.metabolic ?? "none",
            sedation: parsed.sedation ?? "none",
            weightKg: parsed.weightKg ?? null,
          },
          prescription_id: parsed.prescriptionId,
          severity: parsed.severity,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the side-effect check.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: {
          id: row.id,
          patientId: row.patient_id,
          prescriptionId: row.prescription_id,
          severity: row.severity,
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
      effects: row.effects,
      eps: parsed.eps ?? "none",
      id: row.id,
      metabolic: parsed.metabolic ?? "none",
      patientId: row.patient_id,
      prescriptionId: row.prescription_id,
      sedation: parsed.sedation ?? "none",
      severity: row.severity,
      weightKg: parsed.weightKg ?? null,
    };
  });

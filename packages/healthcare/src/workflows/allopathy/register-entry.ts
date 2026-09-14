import { healthcareRegisterEntry } from "#/db-schemas/allopathy";
import { ALLOPATHY_EVENTS } from "#/pubsub";
import { CreateRegisterEntrySchema } from "#/schemas/allopathy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RegisterEntryInputSchema = object({ input: CreateRegisterEntrySchema });

export const registerEntry = Workflow.name("healthcare.allopathy.registerEntry")
  .input(RegisterEntryInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateRegisterEntrySchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    if (parsed.encounterId) {
      const encounter = await ctx.step.run(fetchEncounterStep, {
        id: parsed.encounterId,
      });
      if (encounter.status !== "open") {
        throw new Error("Encounter is signed and immutable; file an addendum instead of editing");
      }
      if (encounter.patient_id !== parsed.patientId) {
        throw new Error("Patient does not match the parent encounter; check the selected patient");
      }
    }
    if (parsed.status === "Final" && (parsed.diagnoses ?? []).length === 0) {
      throw new Error(
        "Final register entry needs at least one diagnosis; save as Draft or add a diagnosis",
      );
    }

    const [row] = await ctx.step.run("insert-register-entry", async () =>
      ctx.db
        .insert(healthcareRegisterEntry)
        .values({
          branch_id: branchId,
          created_by: actorId,
          diagnoses: parsed.diagnoses ?? [],
          encounter_id: parsed.encounterId ?? null,
          notes: parsed.notes ?? null,
          patient_id: parsed.patientId,
          register_type: parsed.registerType,
          status: parsed.status,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the register entry.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ALLOPATHY,
        newState: {
          id: row.id,
          patientId: row.patient_id,
          registerType: row.register_type,
          status: row.status,
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
      diagnoses: row.diagnoses,
      encounterId: row.encounter_id,
      id: row.id,
      notes: row.notes,
      patientId: row.patient_id,
      registerType: row.register_type,
      status: row.status,
    };
  });

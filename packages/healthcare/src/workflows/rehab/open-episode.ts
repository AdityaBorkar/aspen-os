import { healthcareRehabEpisode } from "#/db-schemas/rehab";
import { REHAB_EVENTS } from "#/pubsub";
import { CreateRehabEpisodeSchema } from "#/schemas/rehab";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const OpenEpisodeInputSchema = object({ input: CreateRehabEpisodeSchema });

export const openEpisode = Workflow.name("healthcare.rehab.openEpisode")
  .input(OpenEpisodeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateRehabEpisodeSchema, input);
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

    const [row] = await ctx.step.run("insert-rehab-episode", async () =>
      ctx.db
        .insert(healthcareRehabEpisode)
        .values({
          branch_id: branchId,
          condition: parsed.condition,
          created_by: actorId,
          discipline: parsed.discipline,
          encounter_id: parsed.encounterId ?? null,
          patient_id: parsed.patientId,
          status: parsed.status,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to open the rehab episode.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.REHAB,
        newState: {
          discipline: row.discipline,
          id: row.id,
          patientId: row.patient_id,
          status: row.status,
        },
      });
      await ctx.pubsub.publish(REHAB_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      condition: row.condition,
      createdAt: row.created_at.toISOString(),
      discipline: row.discipline,
      encounterId: row.encounter_id,
      id: row.id,
      patientId: row.patient_id,
      status: row.status,
    };
  });

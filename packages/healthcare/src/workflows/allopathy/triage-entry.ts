import { healthcareTriageEntry } from "#/db-schemas/allopathy";
import { ALLOPATHY_EVENTS } from "#/pubsub";
import { CreateTriageEntrySchema } from "#/schemas/allopathy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const TriageEntryInputSchema = object({ input: CreateTriageEntrySchema });

export const triageEntry = Workflow.name("healthcare.allopathy.triageEntry")
  .input(TriageEntryInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateTriageEntrySchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    if (parsed.encounterId) {
      await ctx.step.run(fetchOpenEncounterStep, {
        id: parsed.encounterId,
        patientId: parsed.patientId,
      });
    }

    const [row] = await ctx.step.run("insert-triage-entry", async () =>
      ctx.db
        .insert(healthcareTriageEntry)
        .values({
          bp_dys: parsed.bpDys ?? null,
          bp_sys: parsed.bpSys ?? null,
          branch_id: branchId,
          created_by: actorId,
          encounter_id: parsed.encounterId ?? null,
          pain_score: parsed.painScore ?? null,
          patient_id: parsed.patientId,
          priority: parsed.priority,
          pulse: parsed.pulse ?? null,
          rr: parsed.rr ?? null,
          spo2: parsed.spo2 ?? null,
          temp_c: parsed.tempC === undefined ? null : String(parsed.tempC),
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the triage entry.");
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
          priority: row.priority,
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
      bpDys: row.bp_dys,
      bpSys: row.bp_sys,
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      encounterId: row.encounter_id,
      id: row.id,
      painScore: row.pain_score,
      patientId: row.patient_id,
      priority: row.priority,
      pulse: row.pulse,
      rr: row.rr,
      spo2: row.spo2,
      tempC: row.temp_c === null ? null : Number(row.temp_c),
    };
  });

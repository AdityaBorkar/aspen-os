import { healthcareTriageEntry } from "#/db-schemas/allopathy";
import { healthcareObservation } from "#/db-schemas/observation";
import { ALLOPATHY_EVENTS } from "#/pubsub";
import { CreateTriageEntrySchema } from "#/schemas/allopathy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import {
  buildVitalsObservationRows,
  OBS_PROFILE_TRIAGE,
} from "#/workflow-steps/canonical-dual-write";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const TriageEntryInputSchema = object({ input: CreateTriageEntrySchema });

export const triageEntry = Workflow.name("emr.allopathy.triageEntry")
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
      // Dual-write (HEALTHCARE-SPEC §§6, 13): legacy triage entry first,
      // canonical observation rows second, inside one transaction. The
      // bp_dys typo is aliased to the diastolic component (never renamed
      // in place); pain lands as a pain-score row. Profile/source are
      // fixed to triage; priority→Flag linkage ships in a later phase.
      ctx.db.transaction(async (tx) => {
        const legacyId = crypto.randomUUID();
        const built = buildVitalsObservationRows({
          absorbedId: legacyId,
          absorbedTable: "healthcare_triage_entry",
          bpDia: parsed.bpDys ?? parsed.bpDia ?? null,
          bpSys: parsed.bpSys ?? null,
          bpText: null,
          branchId,
          encounterId: parsed.encounterId ?? null,
          ews: null,
          note: null,
          painScore: parsed.painScore ?? null,
          patientId: parsed.patientId,
          performerId: actorId,
          profile: OBS_PROFILE_TRIAGE,
          pulse: parsed.pulse ?? null,
          rr: parsed.rr ?? null,
          source: OBS_PROFILE_TRIAGE,
          spo2: parsed.spo2 ?? null,
          tempC: parsed.tempC ?? null,
          weightKg: null,
        });
        const [entry] = await tx
          .insert(healthcareTriageEntry)
          .values({
            // The bpDia alias normalizes into the legacy bp_dys column so
            // legacy reads stay complete until cutover.
            bp_dys: parsed.bpDys ?? parsed.bpDia ?? null,
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
          .returning();
        if (!entry) {
          throw new Error("Failed to record the triage entry.");
        }
        if (built.rows.length > 0) {
          await tx.insert(healthcareObservation).values(built.rows);
        }
        return [entry];
      }),
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

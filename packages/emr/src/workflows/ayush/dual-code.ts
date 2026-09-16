import { healthcareAyushCaseSheet } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { CreateAyushDiagnosisSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DualCodeInputSchema = object({ input: CreateAyushDiagnosisSchema });

export const dualCode = Workflow.name("emr.ayush.dual-code")
  .input(DualCodeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateAyushDiagnosisSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });
    if (!parsed.namasteCode || !parsed.tm2Code) {
      throw new Error("Dual coding is mandatory; provide both NAMASTE and TM2 codes");
    }

    const kase = await ctx.step.run("fetch-case-sheet", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareAyushCaseSheet)
        .where(eq(healthcareAyushCaseSheet.id, parsed.caseId))
        .limit(1);
      if (!row) {
        throw new Error("Case sheet not found; save the case sheet first");
      }
      return row;
    });
    if (kase.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the case sheet; check the selected patient");
    }

    const nowIso = new Date().toISOString();
    const entry = {
      at: nowIso,
      encounterId: parsed.encounterId,
      label: parsed.label ?? null,
      namasteCode: parsed.namasteCode,
      tm2Code: parsed.tm2Code,
    } satisfies Record<string, JsonValue>;
    const prior = kase.payload.diagnoses;
    const diagnoses = [...(Array.isArray(prior) ? prior : []), entry];

    const [row] = await ctx.step.run("append-dual-diagnosis", async () =>
      ctx.db
        .update(healthcareAyushCaseSheet)
        .set({ payload: { ...kase.payload, diagnoses } })
        .where(eq(healthcareAyushCaseSheet.id, parsed.caseId))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the dual-coded diagnosis.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          caseId: row.id,
          id: row.id,
          namasteCode: parsed.namasteCode,
          patientId: row.patient_id,
          tm2Code: parsed.tm2Code,
        },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      caseId: row.id,
      id: row.id,
      label: parsed.label ?? null,
      namasteCode: parsed.namasteCode,
      patientId: row.patient_id,
      tm2Code: parsed.tm2Code,
    };
  });

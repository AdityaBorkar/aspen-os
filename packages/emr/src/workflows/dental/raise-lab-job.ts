import { healthcareLabJob } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { CreateLabJobSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { is, object, parse, string } from "valibot";

const RaiseLabJobInputSchema = object({ input: CreateLabJobSchema });

export const raiseLabJob = Workflow.name("emr.dental.raise-lab-job")
  .input(RaiseLabJobInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLabJobSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    if (parsed.encounterId) {
      await ctx.step.run(fetchOpenEncounterStep, {
        id: parsed.encounterId,
        patientId: parsed.patientId,
      });
    }

    const nowIso = new Date().toISOString();
    const labJobPayload: Record<string, JsonValue> = {};
    if (parsed.dueDate) {
      labJobPayload.dueDate = parsed.dueDate;
    }
    if (parsed.shade) {
      labJobPayload.shade = parsed.shade;
    }
    if (parsed.metal) {
      labJobPayload.metal = parsed.metal;
    }
    if (parsed.qcNote) {
      labJobPayload.qcNote = parsed.qcNote;
    }
    const [row] = await ctx.step.run("insert-lab-job", async () =>
      ctx.db
        .insert(healthcareLabJob)
        .values({
          branch_id: branchId,
          created_by: actorId,
          encounter_id: parsed.encounterId ?? null,
          history: [{ at: nowIso, status: parsed.status }],
          kind: parsed.kind,
          lab_name: parsed.labName,
          patient_id: parsed.patientId,
          payload: labJobPayload,
          plan_id: parsed.planId ?? null,
          status: parsed.status,
          tooth: parsed.tooth ?? null,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to raise the lab job.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.DENTAL,
        newState: {
          id: row.id,
          kind: row.kind,
          labName: row.lab_name,
          patientId: row.patient_id,
          status: row.status,
        },
      });
      await ctx.pubsub.publish(DENTAL_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    const spec: Record<string, JsonValue> = row.payload;
    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      dueDate: is(string(), spec.dueDate) ? spec.dueDate : null,
      encounterId: row.encounter_id,
      history: row.history,
      id: row.id,
      kind: row.kind,
      labName: row.lab_name,
      metal: is(string(), spec.metal) ? spec.metal : null,
      patientId: row.patient_id,
      planId: row.plan_id,
      qcNote: is(string(), spec.qcNote) ? spec.qcNote : null,
      shade: is(string(), spec.shade) ? spec.shade : null,
      status: row.status,
      tooth: row.tooth,
    };
  });

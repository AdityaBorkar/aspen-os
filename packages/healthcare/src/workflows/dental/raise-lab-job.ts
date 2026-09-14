import { healthcareLabJob } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { CreateLabJobSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RaiseLabJobInputSchema = object({ input: CreateLabJobSchema });

export const raiseLabJob = Workflow.name("healthcare.dental.raiseLabJob")
  .input(RaiseLabJobInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLabJobSchema, input);
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

    const nowIso = new Date().toISOString();
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
          payload: {
            ...(parsed.dueDate ? { dueDate: parsed.dueDate } : {}),
            ...(parsed.shade ? { shade: parsed.shade } : {}),
            ...(parsed.metal ? { metal: parsed.metal } : {}),
            ...(parsed.qcNote ? { qcNote: parsed.qcNote } : {}),
          },
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

    const spec =
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {};
    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      dueDate: typeof spec.dueDate === "string" ? spec.dueDate : null,
      encounterId: row.encounter_id,
      history: row.history,
      id: row.id,
      kind: row.kind,
      labName: row.lab_name,
      metal: typeof spec.metal === "string" ? spec.metal : null,
      patientId: row.patient_id,
      planId: row.plan_id,
      qcNote: typeof spec.qcNote === "string" ? spec.qcNote : null,
      shade: typeof spec.shade === "string" ? spec.shade : null,
      status: row.status,
      tooth: row.tooth,
    };
  });

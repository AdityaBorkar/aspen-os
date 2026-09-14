import {
  healthcareTherapyPackage,
  healthcareYogaBatch,
  healthcareYogaEnrollment,
} from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import {
  AyushPrescriptionSchema,
  PackageOutcomeSchema,
  YogaAttendanceSchema,
} from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const YogaAttendanceInputSchema = object({ input: YogaAttendanceSchema });

export const markYogaAttendance = Workflow.name("healthcare.ayush.markYogaAttendance")
  .input(YogaAttendanceInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(YogaAttendanceSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const enrollment = await ctx.step.run("fetch-enrollment", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareYogaEnrollment)
        .where(
          and(
            eq(healthcareYogaEnrollment.batch_id, parsed.batchId),
            eq(healthcareYogaEnrollment.patient_id, parsed.patientId),
          ),
        )
        .limit(1);
      if (!row) {
        throw new Error("Enrollment not found; enroll the patient in the batch first");
      }
      return row;
    });

    const entry = {
      at: new Date().toISOString(),
      attended: parsed.attended,
      date: parsed.date,
      markedBy: actorId,
    } satisfies Record<string, JsonValue>;
    const prior = enrollment.payload.attendance;
    const attendance = [...(Array.isArray(prior) ? prior : []), entry];

    const [row] = await ctx.step.run("record-attendance", async () =>
      ctx.db
        .update(healthcareYogaEnrollment)
        .set({ payload: { ...enrollment.payload, attendance } })
        .where(eq(healthcareYogaEnrollment.id, enrollment.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record yoga attendance.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          attended: parsed.attended,
          batchId: parsed.batchId,
          date: parsed.date,
          patientId: parsed.patientId,
        },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    const batch = await ctx.step.run("fetch-batch", async () => {
      const [b] = await ctx.db
        .select()
        .from(healthcareYogaBatch)
        .where(eq(healthcareYogaBatch.id, parsed.batchId))
        .limit(1);
      return b ?? null;
    });

    return {
      attended: parsed.attended,
      batchId: parsed.batchId,
      batchName: batch?.name ?? null,
      date: parsed.date,
      id: row.id,
      patientId: parsed.patientId,
      sessionsAttended: attendance.filter((a) => {
        const rec = a as Record<string, JsonValue>;
        return rec.attended === true;
      }).length,
    };
  });

const PrescribeAyushInputSchema = object({ input: AyushPrescriptionSchema });

export const prescribeAyush = Workflow.name("healthcare.ayush.prescribe")
  .input(PrescribeAyushInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AyushPrescriptionSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";
    const classical = parsed.items.filter((i) => i.kind === "classical");
    const proprietary = parsed.items.filter((i) => i.kind === "proprietary");

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: parsed.encounterId,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          anupana: parsed.anupana ?? null,
          classicalCount: classical.length,
          encounterId: parsed.encounterId,
          patientId: parsed.patientId,
          proprietaryCount: proprietary.length,
        },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: parsed.encounterId,
      });
    });

    return {
      anupana: parsed.anupana ?? null,
      branchId,
      caseId: parsed.caseId ?? null,
      classical,
      encounterId: parsed.encounterId,
      patientId: parsed.patientId,
      proprietary,
    };
  });

const PackageOutcomeInputSchema = object({ input: PackageOutcomeSchema });

export const recordPackageOutcome = Workflow.name("healthcare.ayush.recordPackageOutcome")
  .input(PackageOutcomeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PackageOutcomeSchema, input);
    const actorId = ctx.actorId ?? "system";

    const pkg = await ctx.step.run("fetch-therapy-package", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareTherapyPackage)
        .where(eq(healthcareTherapyPackage.id, parsed.packageId))
        .limit(1);
      if (!row) {
        throw new Error("Therapy package not found; sell the package first");
      }
      return row;
    });

    const [row] = await ctx.step.run("record-outcome", async () =>
      ctx.db
        .update(healthcareTherapyPackage)
        .set({
          payload: { ...pkg.payload, outcomeNote: parsed.outcomeNote },
          status: "Completed",
        })
        .where(eq(healthcareTherapyPackage.id, parsed.packageId))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the package outcome.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: { id: row.id, status: row.status },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.UPDATED, {
        actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });

    return {
      attended: row.used_sittings ?? 0,
      id: row.id,
      outcomeNote: parsed.outcomeNote,
      remaining: Math.max(0, row.total_sittings - (row.used_sittings ?? 0)),
      status: row.status,
      totalSittings: row.total_sittings,
    };
  });

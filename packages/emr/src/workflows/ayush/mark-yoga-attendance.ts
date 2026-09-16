import { healthcareYogaBatch, healthcareYogaEnrollment } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { YogaAttendanceSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { boolean, is, object, optional, parse, string } from "valibot";

const YogaAttendanceInputSchema = object({ input: YogaAttendanceSchema });

interface YogaAttendanceRecord {
  [key: string]: string | boolean | undefined;
  at?: string;
  attended?: boolean;
  date?: string;
  markedBy?: string;
}

const YogaAttendanceRecordSchema = object({
  at: optional(string()),
  attended: optional(boolean()),
  date: optional(string()),
  markedBy: optional(string()),
});

function isYogaAttendanceRecord(value: JsonValue): value is YogaAttendanceRecord {
  if (value instanceof Date || Array.isArray(value)) {
    return false;
  }
  return is(YogaAttendanceRecordSchema, value);
}

export const markYogaAttendance = Workflow.name("emr.ayush.mark-yoga-attendance")
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
    const attendance: JsonValue[] = [...(Array.isArray(prior) ? prior : []), entry];

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
      const [batchRow] = await ctx.db
        .select()
        .from(healthcareYogaBatch)
        .where(eq(healthcareYogaBatch.id, parsed.batchId))
        .limit(1);
      return batchRow ?? null;
    });

    return {
      attended: parsed.attended,
      batchId: parsed.batchId,
      batchName: batch?.name ?? null,
      date: parsed.date,
      id: row.id,
      patientId: parsed.patientId,
      sessionsAttended: attendance.filter((attendanceEntry) => {
        if (!isYogaAttendanceRecord(attendanceEntry)) {
          return false;
        }
        return attendanceEntry.attended === true;
      }).length,
    };
  });

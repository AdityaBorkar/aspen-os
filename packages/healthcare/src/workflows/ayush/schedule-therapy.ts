import { healthcareTherapyPackage, healthcareTherapySitting } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { CreateTherapySittingSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ScheduleTherapyInputSchema = object({
  input: CreateTherapySittingSchema,
});

export const scheduleTherapy = Workflow.name("healthcare.ayush.scheduleTherapy")
  .input(ScheduleTherapyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateTherapySittingSchema, input);
    const branchId = parsed.branchId ?? "main";
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
    if (pkg.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the therapy package; check the selected patient");
    }
    if (pkg.status !== "Active") {
      throw new Error("Therapy package is not active; resume or extend it before scheduling");
    }
    if (pkg.valid_till && pkg.valid_till.getTime() < Date.now()) {
      throw new Error("Therapy package has expired; extend it before scheduling");
    }
    const attended = pkg.used_sittings ?? 0;
    if (pkg.total_sittings > 0 && attended >= pkg.total_sittings) {
      throw new Error("Package sittings exhausted; sell a new package or extend");
    }

    if (parsed.therapistId) {
      const clash = await ctx.step.run("check-therapist-conflict", async () => {
        const clauses = [
          eq(healthcareTherapySitting.date, parsed.date),
          eq(healthcareTherapySitting.status, "Booked"),
        ];
        const rows = await ctx.db
          .select()
          .from(healthcareTherapySitting)
          .where(and(...clauses));
        return rows.filter((sittingRow) => {
          const { payload: sittingPayload } = sittingRow;
          if (sittingPayload.therapistId === parsed.therapistId) {
            return true;
          }
          if (parsed.roomId && sittingPayload.roomId === parsed.roomId) {
            return true;
          }
          if (parsed.equipmentId && sittingPayload.equipmentId === parsed.equipmentId) {
            return true;
          }
          return false;
        });
      });
      if (clash.length > 0) {
        throw new Error(
          "Therapist/room/equipment is already booked for this date; pick another slot",
        );
      }
    }

    const sittingPayload: Record<string, JsonValue> = {};
    if (parsed.therapistId) {
      sittingPayload.therapistId = parsed.therapistId;
    }
    if (parsed.roomId) {
      sittingPayload.roomId = parsed.roomId;
    }
    if (parsed.equipmentId) {
      sittingPayload.equipmentId = parsed.equipmentId;
    }
    if (parsed.consumables) {
      sittingPayload.consumables = parsed.consumables;
    }
    if (parsed.chargeLines) {
      sittingPayload.chargeLines = parsed.chargeLines;
    }
    const [row] = await ctx.step.run("insert-therapy-sitting", async () =>
      ctx.db
        .insert(healthcareTherapySitting)
        .values({
          branch_id: branchId,
          created_by: actorId,
          date: parsed.date,
          notes: parsed.notes ?? null,
          package_id: parsed.packageId,
          patient_id: parsed.patientId,
          payload: sittingPayload,
          post_bp_dys: null,
          post_bp_sys: null,
          post_pulse: null,
          pre_bp_dys: null,
          pre_bp_sys: null,
          pre_pulse: null,
          status: "Booked",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to schedule the therapy sitting.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          date: row.date,
          id: row.id,
          packageId: row.package_id,
          patientId: row.patient_id,
          status: row.status,
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
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      date: row.date,
      id: row.id,
      packageId: row.package_id,
      patientId: row.patient_id,
      status: row.status,
    };
  });

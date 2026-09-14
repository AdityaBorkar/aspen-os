import { healthcareTherapyPackage, healthcareTherapySitting } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { CreateTherapySittingSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
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

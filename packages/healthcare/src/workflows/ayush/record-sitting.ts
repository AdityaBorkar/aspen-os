import { healthcareTherapyPackage, healthcareTherapySitting } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { CreateTherapySittingSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RecordSittingInputSchema = object({ input: CreateTherapySittingSchema });

export const recordSitting = Workflow.name("healthcare.ayush.recordSitting")
  .input(RecordSittingInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateTherapySittingSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    if (!parsed.preVitals || !parsed.postVitals) {
      throw new Error("Sitting needs both pre- and post-therapy vitals; record both sets");
    }

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
          post_bp_dys: parsed.postVitals.bpDys,
          post_bp_sys: parsed.postVitals.bpSys,
          post_pulse: parsed.postVitals.pulse,
          pre_bp_dys: parsed.preVitals.bpDys,
          pre_bp_sys: parsed.preVitals.bpSys,
          pre_pulse: parsed.preVitals.pulse,
          status: parsed.status,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the therapy sitting.");
    }

    if (parsed.status === "Attended") {
      await ctx.step.run("bump-package-usage", async () => {
        const used = pkg.used_sittings + 1;
        await ctx.db
          .update(healthcareTherapyPackage)
          .set({
            status: pkg.total_sittings > 0 && used >= pkg.total_sittings ? "Completed" : pkg.status,
            used_sittings: used,
          })
          .where(eq(healthcareTherapyPackage.id, parsed.packageId));
      });
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
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
      postVitals: {
        bpDys: row.post_bp_dys,
        bpSys: row.post_bp_sys,
        pulse: row.post_pulse,
      },
      preVitals: {
        bpDys: row.pre_bp_dys,
        bpSys: row.pre_bp_sys,
        pulse: row.pre_pulse,
      },
      status: row.status,
    };
  });

import { healthcareYogaBatch, healthcareYogaEnrollment } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { CreateYogaEnrollmentSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const EnrollYogaInputSchema = object({ input: CreateYogaEnrollmentSchema });

export const enrollYoga = Workflow.name("emr.ayush.enroll-yoga")
  .input(EnrollYogaInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateYogaEnrollmentSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const batch = await ctx.step.run("fetch-yoga-batch", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareYogaBatch)
        .where(eq(healthcareYogaBatch.id, parsed.batchId))
        .limit(1);
      if (!row) {
        throw new Error("Yoga batch not found; create the batch first");
      }
      return row;
    });

    const enrolled = await ctx.step.run("count-enrollments", async () =>
      ctx.db
        .select({ id: healthcareYogaEnrollment.id })
        .from(healthcareYogaEnrollment)
        .where(
          and(
            eq(healthcareYogaEnrollment.batch_id, parsed.batchId),
            eq(healthcareYogaEnrollment.branch_id, branchId),
          ),
        ),
    );
    if (enrolled.length >= batch.capacity) {
      throw new Error("Yoga batch is full; enroll the patient in another batch");
    }

    const [row] = await ctx.step.run("insert-yoga-enrollment", async () =>
      ctx.db
        .insert(healthcareYogaEnrollment)
        .values({
          batch_id: parsed.batchId,
          branch_id: branchId,
          created_by: actorId,
          patient_id: parsed.patientId,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to enroll in the yoga batch.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          batchId: row.batch_id,
          id: row.id,
          patientId: row.patient_id,
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
      batchId: row.batch_id,
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      patientId: row.patient_id,
    };
  });

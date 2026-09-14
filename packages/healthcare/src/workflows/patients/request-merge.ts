import { healthcareMergeRequest } from "#/db-schemas/patient";
import { PATIENT_EVENTS } from "#/pubsub";
import { RequestMergeSchema } from "#/schemas/patients";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPatientStep } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RequestMergeInputSchema = object({ input: RequestMergeSchema });

export const requestMerge = Workflow.name("healthcare.patients.request-merge")
  .input(RequestMergeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RequestMergeSchema, input);
    const branchId = parsed.branchId ?? "main";

    if (parsed.primaryId === parsed.duplicateId) {
      throw new Error("Primary and duplicate must differ; pick two distinct records.");
    }

    const [primary, duplicate] = await Promise.all([
      ctx.step.run(fetchPatientStep, { id: parsed.primaryId }),
      ctx.step.run(fetchPatientStep, { id: parsed.duplicateId }),
    ]);
    if (duplicate.merged_into) {
      throw new Error(
        `Patient "${duplicate.id}" is already merged into "${duplicate.merged_into}"; pick an active record.`,
      );
    }

    const existing = await ctx.step.run("check-pending", async () =>
      ctx.db
        .select({ id: healthcareMergeRequest.id })
        .from(healthcareMergeRequest)
        .where(
          and(
            eq(healthcareMergeRequest.primary_id, parsed.primaryId),
            eq(healthcareMergeRequest.duplicate_id, parsed.duplicateId),
            eq(healthcareMergeRequest.status, "pending"),
          ),
        )
        .limit(1),
    );
    if (existing[0]) {
      throw new Error("A pending merge request already covers this pair; approve it instead.");
    }

    const [row] = await ctx.step.run("insert-merge-request", async () =>
      ctx.db
        .insert(healthcareMergeRequest)
        .values({
          branch_id: branchId,
          duplicate_id: duplicate.id,
          primary_id: primary.id,
          reason: parsed.reason ?? null,
          status: "pending",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to file merge request.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PATIENT,
        metadata: { duplicateId: duplicate.id, kind: "merge-request", primaryId: primary.id },
        newState: { duplicateId: duplicate.id, id: row.id, primaryId: primary.id },
      });
      await ctx.pubsub.publish(PATIENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: primary.id,
      });
    });

    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      duplicateId: row.duplicate_id,
      id: row.id,
      primaryId: row.primary_id,
      reason: row.reason,
      status: row.status,
    };
  });

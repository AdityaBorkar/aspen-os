import { healthcareMergeRequest, healthcarePatient } from "#/db-schemas/patient";
import { PATIENT_EVENTS } from "#/pubsub";
import { ApproveMergeSchema } from "#/schemas/patients";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchMergeRequestStep } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ApproveMergeInputSchema = object({ input: ApproveMergeSchema });

export const approveMerge = Workflow.name("healthcare.patients.approve-merge")
  .input(ApproveMergeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ApproveMergeSchema, input);
    const request = await ctx.step.run(fetchMergeRequestStep, { id: parsed.id });

    if (request.status !== "pending") {
      throw new Error(
        `Merge request "${request.id}" is already ${request.status}; only pending requests can be approved.`,
      );
    }

    // Never delete: the duplicate row stays, marked as merged into the primary.
    await ctx.step.run("mark-merged", async () => {
      const updated = await ctx.db
        .update(healthcarePatient)
        .set({ merged_into: request.primary_id })
        .where(eq(healthcarePatient.id, request.duplicate_id))
        .returning({ id: healthcarePatient.id });
      if (!updated[0]) {
        throw new Error(`Duplicate patient "${request.duplicate_id}" not found.`);
      }
    });

    const [decided] = await ctx.step.run("approve-request", async () =>
      ctx.db
        .update(healthcareMergeRequest)
        .set({ decided_at: new Date(), status: "approved" })
        .where(eq(healthcareMergeRequest.id, request.id))
        .returning(),
    );
    if (!decided) {
      throw new Error("Failed to approve merge request.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.MERGED,
        crudAction: "update",
        entityId: request.duplicate_id,
        entityType: AUDIT_ENTITY_TYPE.PATIENT,
        metadata: { mergeRequestId: request.id },
        newState: { mergedInto: request.primary_id, status: "approved" },
      });
      await ctx.pubsub.publish(PATIENT_EVENTS.MERGED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: request.branch_id,
        id: request.duplicate_id,
      });
    });

    return {
      decidedAt: decided.decided_at?.toISOString() ?? null,
      duplicateId: decided.duplicate_id,
      id: decided.id,
      primaryId: decided.primary_id,
      status: decided.status,
    };
  });

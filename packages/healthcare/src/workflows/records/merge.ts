import { healthcareMergeLog } from "#/db-schemas/records";
import { RECORDS_EVENTS } from "#/pubsub";
import { MergeRecordsSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const MergeInputSchema = object({ input: MergeRecordsSchema });

export const merge = Workflow.name("healthcare.records.merge")
  .input(MergeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(MergeRecordsSchema, input);
    const branchId = parsed.branchId ?? "main";
    if (parsed.primaryId === parsed.duplicateId) {
      throw new Error("Primary and duplicate ids differ; check both ids and retry");
    }
    const [row] = await ctx.step.run("insert-merge", async () =>
      ctx.db
        .insert(healthcareMergeLog)
        .values({
          branch_id: branchId,
          duplicate_id: parsed.duplicateId,
          merged_by: parsed.mergedBy,
          payload: { historiesPreserved: true, pointerUpdate: "patients-slice" },
          primary_id: parsed.primaryId,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record merge.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.MERGED,
        crudAction: "update",
        entityId: row.primary_id,
        entityType: AUDIT_ENTITY_TYPE.RECORDS,
        newState: { duplicateId: row.duplicate_id, primaryId: row.primary_id },
      });
      await ctx.pubsub.publish(RECORDS_EVENTS.MERGED, {
        actorId: ctx.actorId,
        at,
        branchId,
        data: { duplicateId: row.duplicate_id, primaryId: row.primary_id },
        id: row.id,
      });
    });
    return { duplicateId: row.duplicate_id, primaryId: row.primary_id };
  });

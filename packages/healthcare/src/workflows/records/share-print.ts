import { healthcareShareLog } from "#/db-schemas/records";
import { RECORDS_EVENTS } from "#/pubsub";
import { ShareRecordSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertShareConfirmed } from "#/workflows/shared/share-guard";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SharePrintInputSchema = object({ input: ShareRecordSchema });

export const sharePrint = Workflow.name("healthcare.records.share-print")
  .input(SharePrintInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ShareRecordSchema, input);
    const branchId = parsed.branchId ?? "main";
    assertShareConfirmed(parsed.recipientConfirm);
    const [row] = await ctx.step.run("insert-share", async () =>
      ctx.db
        .insert(healthcareShareLog)
        .values({
          branch_id: branchId,
          channel: "print",
          doc_id: parsed.docId ?? null,
          patient_id: parsed.patientId ?? null,
          recipient: parsed.recipient,
          shared_by: parsed.sharedBy,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to log print share.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RECORDS,
        newState: { channel: row.channel, recipient: row.recipient },
      });
      await ctx.pubsub.publish(RECORDS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { channel: "print", shareId: row.id };
  });

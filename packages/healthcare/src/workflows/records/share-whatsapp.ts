import { healthcareShareLog } from "#/db-schemas/records";
import { buildCommsMessageQueuedEvent } from "#/integrations/comms";
import { RECORDS_EVENTS } from "#/pubsub";
import { ShareRecordSchema } from "#/schemas/records";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import {
  assertRecipientOptedIn,
  assertShareConfirmed,
  queueOutboundMessage,
} from "#/workflows/shared/messaging";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ShareWhatsappInputSchema = object({ input: ShareRecordSchema });

export const shareWhatsapp = Workflow.name("healthcare.records.share-whatsapp")
  .input(ShareWhatsappInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ShareRecordSchema, input);
    const branchId = parsed.branchId ?? "main";
    assertShareConfirmed(parsed.recipientConfirm);
    await ctx.step.run("check-optout", async () => {
      await assertRecipientOptedIn(ctx.db, branchId, parsed.recipient);
    });
    const [row] = await ctx.step.run("insert-share", async () =>
      ctx.db
        .insert(healthcareShareLog)
        .values({
          branch_id: branchId,
          channel: "whatsapp",
          doc_id: parsed.docId ?? null,
          patient_id: parsed.patientId ?? null,
          recipient: parsed.recipient,
          shared_by: parsed.sharedBy,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to log whatsapp share.");
    }
    await ctx.step.run("queue-message", async () =>
      queueOutboundMessage(ctx.db, {
        branchId,
        channel: "whatsapp",
        patientId: parsed.patientId ?? null,
        to: parsed.recipient,
      }),
    );
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
        data: {
          channel: row.channel,
          docId: row.doc_id ?? null,
          healthcareShareId: row.id,
          patientId: row.patient_id ?? null,
          to: row.recipient,
        },
        id: row.id,
      });
      await ctx.pubsub.publish(
        "comms.message_queued",
        buildCommsMessageQueuedEvent({
          branchId,
          channel: "whatsapp",
          healthcareMessageId: row.id,
          patientId: parsed.patientId ?? null,
          to: parsed.recipient,
        }),
      );
    });
    return { channel: "whatsapp", shareId: row.id };
  });

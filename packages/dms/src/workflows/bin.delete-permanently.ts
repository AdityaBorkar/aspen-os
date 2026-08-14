import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { DOCUMENT_EVENTS } from "../pubsub";
import { deleteDocumentPermanently, isDocumentHeld } from "../services/purge-service";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchDocumentStep } from "./steps/fetch-document";

const DeleteInputSchema = object({ id: IdSchema });

export const deleteDocumentPermanentlyWorkflow = Workflow.name("dms.bin.delete-permanently")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId: id });

    if (doc.status !== "deleted" && doc.status !== "expired") {
      throw new Error("Only documents in the recycle bin can be permanently deleted.");
    }

    const held = await ctx.step.run("check-hold", async () => isDocumentHeld(ctx.db, id));

    if (held) {
      throw new Error(
        `Document "${id}" is under an active legal hold and cannot be permanently deleted.`,
      );
    }

    const keys = await ctx.step.run("purge-document", async () =>
      deleteDocumentPermanently(ctx.db, id),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.PURGED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        metadata: { storageKey: keys[0] ?? null },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.PURGED, {
        documentId: id,
        storageKey: keys[0] ?? "",
      });
    });

    return { deleted: true, freedStorageKeys: keys };
  });

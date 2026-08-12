import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { nullable, object, optional, string } from "valibot";

import { dmsDocument } from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchDocumentStep } from "./steps/fetch-document";

const RestoreInputSchema = object({
  expiryDate: optional(nullable(string())),
  id: IdSchema,
});

export const restoreDocument = Workflow.name("dms.bin.restore")
  .input(RestoreInputSchema)
  .handler(async ({ id, expiryDate }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId: id });

    if (doc.status !== "deleted" && doc.status !== "expired") {
      throw new Error(
        `Document "${id}" cannot be restored (status is "${doc.status}").`,
      );
    }

    const [updated] = await ctx.db
      .update(dmsDocument)
      .set({
        deletedAt: null,
        deletedBy: null,
        expiredAt: null,
        expiryDate: expiryDate ?? null,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(dmsDocument.id, id))
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.RESTORED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        newState: { status: "active" },
        previousState: { status: doc.status },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.RESTORED, { documentId: id });
    });

    return updated ?? doc;
  });

export const restoreExpiredDocument = restoreDocument;

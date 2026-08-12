import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { integer, object, pipe, number as valibotNumber } from "valibot";

import { dmsDocumentVersion } from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import { remove as removeStorage } from "../services/storage-bridge";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchDocumentStep } from "./steps/fetch-document";

const DeleteVersionInputSchema = object({
  documentId: IdSchema,
  version: pipe(valibotNumber(), integer()),
});

export const deleteDocumentVersion = Workflow.name("dms.version.delete")
  .input(DeleteVersionInputSchema)
  .handler(async ({ documentId, version }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId });

    if (version === doc.version) {
      throw new Error(
        "Cannot delete the current version. Revert to another version first.",
      );
    }

    const [row] = await ctx.db
      .select()
      .from(dmsDocumentVersion)
      .where(
        and(
          eq(dmsDocumentVersion.documentId, documentId),
          eq(dmsDocumentVersion.version, version),
        ),
      )
      .limit(1);

    if (!row) {
      throw new Error(`Document "${documentId}" has no version "${version}".`);
    }

    const otherCount = await ctx.db
      .select({ id: dmsDocumentVersion.id })
      .from(dmsDocumentVersion)
      .where(
        and(
          eq(dmsDocumentVersion.documentId, documentId),
          ne(dmsDocumentVersion.id, row.id),
        ),
      )
      .limit(1);

    if (otherCount.length === 0) {
      throw new Error(
        "A document must retain at least one version. Current history is the only version.",
      );
    }

    await ctx.step.run("remove-storage", async () => {
      await removeStorage({ key: row.storageKey });
    });

    await ctx.step.run("delete-row", async () => {
      await ctx.db
        .delete(dmsDocumentVersion)
        .where(eq(dmsDocumentVersion.id, row.id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "delete",
        entityId: documentId,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        metadata: { version },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.UPDATED, {
        changes: { removedVersion: version },
        documentId,
      });
    });

    return { deleted: true, version };
  });

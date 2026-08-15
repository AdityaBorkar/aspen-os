import { dmsFileVersion } from "#/db-schemas";
import { FILE_EVENTS } from "#/pubsub";
import { remove as removeStorage } from "#/services/storage-bridge";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFileStep } from "#/workflow-steps/fetch-file";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { integer, object, pipe, number as valibotNumber } from "valibot";

const DeleteVersionInputSchema = object({
  fileId: IdSchema,
  version: pipe(valibotNumber(), integer()),
});

export const deleteFileVersion = Workflow.name("dms.version.delete")
  .input(DeleteVersionInputSchema)
  .handler(async ({ fileId, version }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id: fileId });

    if (version === file.version) {
      throw new Error("Cannot delete the current version. Revert to another version first.");
    }

    const [row] = await ctx.db
      .select()
      .from(dmsFileVersion)
      .where(and(eq(dmsFileVersion.fileId, fileId), eq(dmsFileVersion.version, version)))
      .limit(1);

    if (!row) {
      throw new Error(`File "${fileId}" has no version "${version}".`);
    }

    const otherCount = await ctx.db
      .select({ id: dmsFileVersion.id })
      .from(dmsFileVersion)
      .where(and(eq(dmsFileVersion.fileId, fileId), ne(dmsFileVersion.id, row.id)))
      .limit(1);

    if (otherCount.length === 0) {
      throw new Error(
        "A file must retain at least one version. Current history is the only version.",
      );
    }

    await ctx.step.run("remove-storage", async () => {
      await removeStorage({ key: row.storageKey });
    });

    await ctx.step.run("delete-row", async () => {
      await ctx.db.delete(dmsFileVersion).where(eq(dmsFileVersion.id, row.id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "delete",
        entityId: fileId,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: { version },
      });

      await ctx.pubsub.publish(FILE_EVENTS.UPDATED, {
        changes: { removedVersion: version },
        fileId,
      });
    });

    return { deleted: true, version };
  });

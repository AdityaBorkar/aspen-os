import { dmsFileVersion } from "#/db-schemas";
import { FILE_EVENTS } from "#/pubsub";
import { revertVersion } from "#/services/version-service";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFileStep } from "#/workflow-steps/fetch-file";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { integer, object, pipe, number as valibotNumber } from "valibot";

const RevertInputSchema = object({
  fileId: IdSchema,
  version: pipe(valibotNumber(), integer()),
});

export const revertToVersion = Workflow.name("dms.version.revert")
  .input(RevertInputSchema)
  .handler(async ({ fileId, version }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id: fileId });

    if (file.status === "trashed") {
      throw new Error(`File "${fileId}" is trashed and cannot be reverted.`);
    }

    if (version === file.version) {
      throw new Error(`Version "${version}" is already the current version.`);
    }

    const target = await ctx.step.run("fetch-target-version", async () => {
      const [row] = await ctx.db
        .select()
        .from(dmsFileVersion)
        .where(and(eq(dmsFileVersion.fileId, fileId), eq(dmsFileVersion.version, version)))
        .limit(1);
      if (!row) {
        throw new Error(`File "${fileId}" has no version "${version}".`);
      }
      return row;
    });

    const actorId = ctx.actorId ?? file.ownerId;
    const { newVersion: newVersionNumber, updated } = await ctx.step.run("revert-bytes", async () =>
      revertVersion(ctx.db, file, { actorId, target }),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.VERSION_REVERTED,
        crudAction: "update",
        entityId: fileId,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: { revertedFrom: version, version: newVersionNumber },
        newState: { name: target.name, version: newVersionNumber },
        previousState: { name: file.name, version: file.version },
      });

      await ctx.pubsub.publish(FILE_EVENTS.VERSION_REVERTED, {
        fileId,
        version: newVersionNumber,
      });
    });

    return updated ?? file;
  });
